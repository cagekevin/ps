import { CepError, ERR_PREFIX } from '@/utils/errors'
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
 * 注释里承诺的 FIFO 恰好最需要的时候破功（TD-13-2）。
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
      result: Promise.reject(new CepError('NO_CEP', '当前不在 CEP 环境里，无法调用 ExtendScript')),
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
      // 用独立 code 承载这个不确定性，文案层不许把它说成普通失败（TD-13-2）。
      reject(
        new CepError(
          'TIMEOUT_UNKNOWN',
          `Photoshop 在 ${timeout}ms 内没有回包（脚本可能仍在执行，也可能已经执行完）：${script.slice(0, 60)}`,
        ),
      )
      graceTimer = setTimeout(() => {
        log.warn('cep', 'ExtendScript 超时后始终没有回包，强制放行串行队列（PS 侧可能有脚本仍在跑）', {
          script: script.slice(0, 60),
          graceMs: LOCK_GRACE_MS,
        })
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
            reject(new CepError('JSX', 'EvalScript 执行失败（脚本抛错，或 jsx 尚未加载）'))
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
 * 调用一个 jsx 全局函数。
 * - 自动包 try/catch，异常统一变成 ERR:<message>
 * - 返回字符串原样给出，其余 JSON.parse 后给出
 */
export async function jsxCall<T = unknown>(
  fn: string,
  args: unknown[] = [],
  opts: { timeout?: number; label?: string } = {},
): Promise<T> {
  // undefined 进不了 toJsxArg：JSON.stringify(undefined) 返回 undefined（不是字符串），
  // 接着 .replace 会抛 TypeError，把「参数漏传」伪装成编译器内部错误。
  // 这里提前拦，报出是第几个参数。
  for (let i = 0; i < args.length; i++) {
    if (args[i] === undefined) {
      const where = opts.label ?? fn
      throw new CepError(
        'JSX',
        `${where}：第 ${i + 1} 个参数是 undefined（jsx 侧收到的是字符串，漏传会静默变 null）`,
      )
    }
  }

  const argStr = args.map(toJsxArg).join(', ')
  const script =
    `(function(){try{var __r = ${fn}(${argStr});` +
    `return (typeof __r === 'string') ? __r : JSON.stringify(__r);}` +
    `catch(e){return '${ERR_PREFIX}' + ((e && e.message) ? e.message : String(e));}})()`

  const raw = await evalScriptRaw(script, opts.timeout ?? DEFAULT_TIMEOUT)

  if (raw.startsWith(ERR_PREFIX)) {
    throw new CepError('JSX', `${opts.label ?? fn}：${raw.slice(ERR_PREFIX.length)}`)
  }
  if (raw === '' || raw === 'undefined') return undefined as T
  try {
    return JSON.parse(raw) as T
  } catch {
    return raw as unknown as T
  }
}
