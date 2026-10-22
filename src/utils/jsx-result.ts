// 是什么：jsx 返回值（{err,msg,data} / null / 数组 / "ok"）的唯一解释器
// 唯一入口：所有命令判断 jsx 成败只能经过这里
// 替代了什么：各命令里散落的 `res.err === 1`，以及"没返回就当成功"的隐式假设
// 谁在用：commands/**；页面/组件不 import
// 禁止：不要在这里做业务判断（哪个 err 该提示什么），只归一形状

import { CepError } from './errors'

/**
 * 原版 jsx 返回的两种写法：
 * - `{ err: 0|1, msg?: string, code?: number, data?: unknown }`
 * - 无返回值 / `"ok"` / 数组（如 `ztgl_initSystemList`）
 *
 * 依据：`app.v4.js` 调用侧全部写 `res.err == 1`（如 `:236`、`:293`）。
 * 原版 `jsxNoCheck` 只 `JSON.parse` 一次，不存在"双层 JSON"契约；
 * 这里也不做二次拆包，避免把错误数据当成合法对象。
 */
export interface JsxResult {
  ok: boolean
  err?: number
  code?: number | string
  msg?: string
  data?: unknown
}

const EMPTY_STRINGS = new Set(['', 'ok', 'OK', 'undefined'])

export function asJsxResult(raw: unknown): JsxResult {
  if (raw === null || raw === undefined) return { ok: true }

  if (typeof raw === 'string') {
    return EMPTY_STRINGS.has(raw) ? { ok: true } : { ok: true, data: raw }
  }

  if (typeof raw !== 'object') return { ok: true, data: raw }
  if (Array.isArray(raw)) return { ok: true, data: raw }

  const record = raw as Record<string, unknown>
  if (!('err' in record)) return { ok: true, data: raw }

  // 原版用 `==`，字符串 "1" 也算失败
  const err = Number(record.err)
  const result: JsxResult = { ok: !(err === 1), err, data: record.data }
  if (typeof record.msg === 'string') result.msg = record.msg
  if (typeof record.code === 'number' || typeof record.code === 'string') result.code = record.code
  return result
}

/** 需要 `data` 的读操作：失败直接抛，成功返回 data（可能是 undefined） */
export function requireJsxOk(raw: unknown, fallback: string): unknown {
  const result = asJsxResult(raw)
  if (!result.ok) throw new CepError('JSX', result.msg || fallback)
  return result.data
}

/** 只关心成败的写操作：失败直接抛 */
export function assertJsxOk(raw: unknown, fallback: string): void {
  requireJsxOk(raw, fallback)
}
