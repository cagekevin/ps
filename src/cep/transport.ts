import { CepError, ERR_PREFIX } from '@/utils/errors'

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
 * 裸 evalScript：只负责把字符串丢进去、把字符串拿回来，带超时。
 * 需要结构化错误和返回值解析，用 jsxCall。
 *
 * 注意：所有调用都会排队，不会并发进入 ExtendScript。
 */
export function evalScriptRaw(script: string, timeout = DEFAULT_TIMEOUT): Promise<string> {
  const task = queue.then(() => runScript(script, timeout))
  // 队列继续往下走，失败也不阻塞
  queue = task.then(
    () => undefined,
    () => undefined,
  )
  return task
}

function runScript(script: string, timeout: number): Promise<string> {
  const bridge = window.__adobe_cep__
  if (!bridge) {
    return Promise.reject(new CepError('NO_CEP', '当前不在 CEP 环境里，无法调用 ExtendScript'))
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new CepError('TIMEOUT', `ExtendScript 超时（${timeout}ms）：${script.slice(0, 60)}`))
    }, timeout)

    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
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
