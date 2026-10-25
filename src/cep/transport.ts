import { CepError, ERR_PREFIX } from '@/utils/errors'
import { msg } from '@/domain/messages'
import type { JsxName } from './jsx/names'
import { asJsxOutcome, isJsxEmpty, isJsxOkSentinel, type JsxOutcome } from '@/utils/jsx-result'
import { log } from '@/utils/logger'

const DEFAULT_TIMEOUT = 30000

export function hasCep(): boolean {
  return typeof window.__adobe_cep__?.evalScript === 'function'
}

/**
 * jsx 调用串行队列。
 *
 * ExtendScript 是单线程的，并发发多条 evalScript 时返回顺序不保证。
 * 表现：快速连点 3 个字体，最后生效的可能不是最后点的那一个。
 * 这里用 Promise 链保证先进先出；某条失败不影响后续。
 */
let queue: Promise<unknown> = Promise.resolve()

/**
 * 上一条脚本的「ExtendScript 真的回来了」信号。
 *
 * 队列放行看的是它，**不看我们自己的超时**：超时只代表"我们不等了"，
 * PS 侧那条脚本还在跑；此时放行下一条，两条会在 PS 里交错执行，
 * 注释里承诺的 FIFO 恰好最需要的时候破功。
 */
let bridgeReturned: Promise<void> = Promise.resolve()

/** 超时之后最多再等这么久；到点强制放行，并留下 warn（不能让队列永久卡死） */
const LOCK_GRACE_MS = 120_000

/**
 * 裸 evalScript：只负责把字符串丢进去、把字符串拿回来，带超时。
 * 需要结构化错误和返回值解析，用 jsxCall。
 *
 * 注意：所有调用都会排队，不会并发进入 ExtendScript。
 */
export function evalScriptRaw(script: string, timeout = DEFAULT_TIMEOUT): Promise<string> {
  const task = queue.then(() => {
    const running = runScript(script, timeout)
    bridgeReturned = running.returned
    return running.result
  })
  // 队列等"真的回来了"再放行（成功、失败、超时三条路都一样）
  queue = task.then(releaseQueue, releaseQueue)
  return task
}

function releaseQueue(): Promise<void> {
  return bridgeReturned.then(
    () => undefined,
    () => undefined,
  )
}

/**
 * 一条脚本的两种结局：
 * - `result`：我们等的那条，超时就 reject `TIMEOUT_UNKNOWN`
 * - `returned`：PS 真的回包（或确定回不来了）才 resolve，队列靠它放行
 */
function runScript(
  script: string,
  timeout: number,
): { result: Promise<string>; returned: Promise<void> } {
  const bridge = window.__adobe_cep__
  if (!bridge) {
    return {
      result: Promise.reject(new CepError('NO_CEP', msg.ps.text.notInCep)),
      returned: Promise.resolve(),
    }
  }

  let markReturned = () => {}
  const returned = new Promise<void>((resolve) => {
    markReturned = resolve
  })

  const result = new Promise<string>((resolve, reject) => {
    let settled = false
    let graceTimer: ReturnType<typeof setTimeout> | undefined

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      // 只说「我们不等了」，不说「没做成」：PS 侧那条脚本可能还在跑、也可能已经执行完。
      // 用独立 code 承载这个不确定性，文案层不许把它说成普通失败。
      reject(
        new CepError(
          'TIMEOUT_UNKNOWN',
          msg.ps.fn.timeoutUnknown(String(timeout), script.slice(0, 60)),
        ),
      )
      graceTimer = setTimeout(() => {
        log.warn(
          'cep',
          'ExtendScript 超时后始终没有回包，强制放行串行队列（PS 侧可能有脚本仍在跑）',
          {
            script: script.slice(0, 60),
            graceMs: LOCK_GRACE_MS,
          },
        )
        markReturned()
      }, LOCK_GRACE_MS)
    }, timeout)

    const done = (fn: () => void) => {
      if (settled) {
        // 超时之后晚到的回包：结果早丢弃了（settled 只防二次结算），但队列要靠它放行
        if (graceTimer) clearTimeout(graceTimer)
        log.info('cep', 'ExtendScript 在超时之后才回包，串行队列解锁', {
          script: script.slice(0, 60),
        })
        markReturned()
        return
      }
      settled = true
      clearTimeout(timer)
      fn()
      markReturned()
    }

    try {
      bridge.evalScript(script, (res: string) => {
        done(() => {
          // CEP 在脚本抛错时只给这一句，分不清具体原因，所以 jsx 侧要自己 try/catch
          if (res === 'EvalScript error.') {
            reject(new CepError('JSX', msg.ps.text.evalScriptFailed))
            return
          }
          resolve(res)
        })
      })
    } catch (e) {
      done(() => reject(new CepError('JSX', e instanceof Error ? e.message : String(e))))
    }
  })

  return { result, returned }
}

/** 按原面板的约定拼参数：字符串/对象用单引号包，数字布尔裸传 */
function toJsxArg(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  // 先转义反斜杠再转义单引号，顺序不能反
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

/**
 * **写操作的统一入口**：失败在**生产者层直接抛**（消费侧只管 `await`，不可能忘判 ok）。
 *
 * 以前写操作返回两臂让消费侧自己判 —— 20 处忘了判 ⇒ `{err:1}` 静默。
 * 真正该抛的地方是这里（生产者），不是每个消费点各加一个 fallback。
 */
export async function jsxWrite(
  fn: JsxName,
  args: unknown[] = [],
  opts: { timeout?: number; label?: string } = {},
): Promise<void> {
  const outcome = await jsxCall(fn, args, opts)
  if (!outcome.ok) {
    // `hostCode` 带到错误上（字体缺失流程靠 `CepError.hostCode === 1` 判定）——
    // 这样消费侧 catch 就够了，不需要单独开一个"返回失败臂"的入口
    throw new CepError(outcome.code, outcome.reason || opts.label || fn, outcome.hostCode)
  }
}

/**
 * 读操作的统一入口：返回**两臂**（`JsxOutcome`），消费侧判 `.ok` 取 `data`。
 *
 * 与 `jsxWrite` 的分工是深模块的窄接口：
 * - 读 = 要数据 ⇒ 返回两臂，消费侧判 ok；
 * - 写 = 不要数据 ⇒ `jsxWrite` 在生产者层抛（消费侧不可能忘判）。
 *
 * **唯一入口**：域文件只调 `jsxRead` / `jsxWrite`，不许直调 `jsxCall`（它已内部化）。
 */
export async function jsxRead(
  fn: JsxName,
  args: unknown[] = [],
  opts: { timeout?: number; label?: string } = {},
): Promise<JsxOutcome<unknown>> {
  return jsxCall(fn, args, opts)
}

/**
 * 调用一个 jsx 全局函数（**内部**，不导出）——
 * 域文件只调 `jsxRead`（读）/ `jsxWrite`（写），不许直调这里（唯一入口）。
 * - 自动包 try/catch，异常统一变成 ERR:<message>
 * - **返回两臂**（`JsxOutcome`）：宿主失败、返回结构不认识、宿主脚本抛异常，全部走失败臂；
 *   调用方不需要 try/catch，也拿不到 `err` / `raw`。
 *
 * 只有"调用方自己的 bug"（参数漏传 `undefined`）仍抛 —— 那是编程错误，不是宿主失败。
 */
async function jsxCall(
  /** 只收 `src/cep/jsx/names.ts` 生成的名字：写错一个字母编译不过（jsx:dispatch:check 的结构替代物） */
  fn: JsxName,
  args: unknown[] = [],
  opts: { timeout?: number; label?: string } = {},
): Promise<JsxOutcome<unknown>> {
  // undefined 进不了 toJsxArg：JSON.stringify(undefined) 返回 undefined（不是字符串），
  // 接着 .replace 会抛 TypeError，把「参数漏传」伪装成编译器内部错误。
  // 这里提前拦，报出是第几个参数。
  for (let i = 0; i < args.length; i++) {
    if (args[i] === undefined) {
      const where = opts.label ?? fn
      throw new CepError('JSX', msg.ps.fn.argUndefined(where, String(i + 1)))
    }
  }

  const argStr = args.map(toJsxArg).join(', ')
  const script =
    `(function(){try{var __r = ${fn}(${argStr});` +
    `return (typeof __r === 'string') ? __r : JSON.stringify(__r);}` +
    `catch(e){return '${ERR_PREFIX}' + ((e && e.message) ? e.message : String(e));}})()`

  const raw = await evalScriptRaw(script, opts.timeout ?? DEFAULT_TIMEOUT)

  // **两类失败，两条路（语义不同，不是两份真相）**：
  // ① 宿主/环境层失败（脚本抛异常、返回值不是 JSON）→ **抛**。这类失败连"宿主返回了什么"
  //    都没有，命令层原来就是靠 throw 感知它；不抛的话所有不判 ok 的调用点会静默成功。
  // ② 宿主明确返回了 `{err}` → 走**失败臂**（`asJsxOutcome` 解释），失败一定带 code。
  if (raw.startsWith(ERR_PREFIX)) {
    throw new CepError('JSX', msg.ps.fn.jsxThrow(opts.label ?? fn, raw.slice(ERR_PREFIX.length)))
  }
  // 哨兵：空 → 无数据；'ok' → 原值（调用方靠它区分"宿主说 ok"与"宿主给了数据"）
  if (isJsxEmpty(raw)) return { ok: true, data: undefined }
  if (isJsxOkSentinel(raw)) return { ok: true, data: raw }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // 非 JSON 且不是哨兵 = **读不懂**。以前这里 `return raw as unknown as T`，
    // 把字符串当对象交给消费侧，形状错误一路流到业务
    throw new CepError('PARSE', msg.ps.fn.resultNotJson(opts.label ?? fn, raw.slice(0, 80)))
  }
  // 只有"宿主明确返回了 err"才走失败臂
  return asJsxOutcome(parsed)
}
