import type { CepErrorCode } from './types'

/** jsx 侧统一用这个前缀回传异常，见 jsxCall 里的包装 */
export const ERR_PREFIX = 'ERR:'

const DEFAULT_TIMEOUT = 30000

export class CepError extends Error {
  readonly code: CepErrorCode

  constructor(code: CepErrorCode, message: string) {
    super(message)
    this.name = 'CepError'
    this.code = code
  }
}

export function hasCep(): boolean {
  return typeof window.__adobe_cep__?.evalScript === 'function'
}

/**
 * 把错误翻成人话，UI 层直接拿去 toast。
 * 页面里不要再各写各的文案。
 */
export function describeCepError(e: unknown): string {
  if (e instanceof CepError) {
    switch (e.code) {
      case 'NO_CEP':
        return '当前不在 Photoshop 面板中运行'
      case 'NO_NODE':
        return 'Node 不可用，请检查 manifest 里的 --enable-nodejs'
      case 'TIMEOUT':
        return 'Photoshop 没有响应，请稍后重试'
      case 'NO_SELECTION':
        return e.message
      case 'INIT':
        return `Photoshop 脚本初始化失败：${e.message}`
      default:
        return e.message
    }
  }
  return e instanceof Error ? e.message : String(e)
}

/**
 * 裸 evalScript：只负责把字符串丢进去、把字符串拿回来，带超时。
 * 需要结构化错误和返回值解析，用 jsxCall。
 */
export function evalScriptRaw(script: string, timeout = DEFAULT_TIMEOUT): Promise<string> {
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
