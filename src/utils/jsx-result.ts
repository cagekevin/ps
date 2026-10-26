// 是什么：jsx 返回值（{err,msg,data} / null / 数组 / "ok"）的**唯一解释器**，产出两臂 `JsxOutcome`
// 唯一入口：所有命令判断 jsx 成败只能经过这里
// 替代了什么：各命令里散落的 `res.err === 1`；`requireJsxOk` 返回 `unknown` 后调用点各自 `as` 猜形状
// 谁在用：`cep/transport`（把宿主返回值解释成两臂）· `commands/**`（消费两臂）· 页面/组件不 import
// 禁止：不要在这里做业务判断（哪个失败该提示什么），只归一形状
import type { CepErrorCode } from './errors'
import { isRecord } from './guards'
import { isDecodeFail, type DecodeFail, type Decoder } from './decode'

/**
 * jsx 调用的结果：**两臂**。
 *
 * - 成功臂 `{ ok: true; data }` —— `data` 是**域层解码后**的形状（不是 `unknown`）。
 * - 失败臂 `{ status: 'error'; fail; reason }` —— `fail` 是本仓错误码，命令层直接抛它。
 *
 * 为什么两臂（而不是 `unknown` 让调用点自己判）：
 * ① `unknown` 会让每个调用点各自 `as` 猜形状 —— 旧 `requireJsxOk` 返回 `unknown`，于是 4 处 `as`；
 * ② `err` 的判定散在多处（jsx 侧 `err === 1`、CEP 原生侧 `err !== 0`），同一份 `{err}` 两种口径。
 * 两臂之后：**判定只在这里一次**，失败一定带 code（没有 code 的失败在 R3 里也写不出来）。
 */
export type JsxOutcome<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; fail: CepErrorCode; reason: string; hostCode?: number | string }

/**
 * 宿主**认识的** err 值：`0` 成功、`1` 失败。其余（`2` / `-1` / `NaN`）是未知状态 ——
 * 以前它们全被当成成功（原版 `res.err == 1` 判失败），现在一律失败且说明原因。
 */
const KNOWN_JSX_ERR = new Set([0, 1])

/** 空哨兵：`''` / `'undefined'`（宿主"什么都没返回"的两种写法） */
export function isJsxEmpty(raw: unknown): boolean {
  return raw === '' || raw === 'undefined'
}

/** 成功哨兵：`'ok'` / `'OK'`（写操作没有返回值时宿主回它）。类型谓词：调用点能收窄到字面量 */
export function isJsxOkSentinel(raw: unknown): raw is 'ok' | 'OK' {
  return raw === 'ok' || raw === 'OK'
}

/**
 * 宿主返回值 → 两臂。**唯一生产者**（`transport` 与命令层都只经过它）。
 *
 * 口径：只有 `err === 0` 是成功。`err` 不在 `{0, 1}` 内是**未知状态** ——
 * 一律失败并报出原值，不再当成功。
 */
export function asJsxOutcome(raw: unknown): JsxOutcome<unknown> {
  if (raw === null || raw === undefined) return { status: 'ok', data: undefined }
  if (typeof raw === 'string') {
    // 空哨兵（'' / 'undefined'）= 什么都没返回 → data 为 undefined；
    // **'ok' / 'OK' 保留原值**（旧 transport 就是这么给的）——
    // 有调用方靠它区分"宿主说 ok"与"宿主真的给了数据"（`cep/data/font-list.ts`）。
    return isJsxEmpty(raw) ? { status: 'ok', data: undefined } : { status: 'ok', data: raw }
  }
  if (typeof raw !== 'object') return { status: 'ok', data: raw }
  if (Array.isArray(raw)) return { status: 'ok', data: raw }
  if (!isRecord(raw)) return { status: 'ok', data: raw }
  if (!('err' in raw)) return { status: 'ok', data: raw }

  const err = Number(raw.err)
  if (err === 0) return { status: 'ok', data: raw.data }

  const msg = typeof raw.msg === 'string' ? raw.msg : undefined
  const hostCode =
    typeof raw.code === 'number' || typeof raw.code === 'string' ? raw.code : undefined
  if (!KNOWN_JSX_ERR.has(err)) {
    return {
      status: 'error',
      // 未知状态 = **读不懂返回值**（不是"宿主说失败"）⇒ 归 `PARSE`，不归 `JSX`
      fail: 'PARSE',
      reason: `宿主返回未知状态 err=${String(raw.err)}`,
      hostCode,
    }
  }
  return {
    status: 'error',
    fail: 'JSX',
    reason: msg ?? (hostCode !== undefined ? `宿主返回 code=${String(hostCode)}` : '宿主返回失败'),
    hostCode,
  }
}

/**
 * 带数据形状的版本：**成功臂的 `data` 由 `decode` 证明**。
 *
 * `decode` 是 `Decoder<T>`（`Decoded | DecodeFail`）：**"结构不认识"不再是一个说不出口的 `null`**，
 * 失败臂带上码与观测（`shape.top(expected=array)` 这种），失败在类型上取不到值。
 * 域层用它把 `unknown` 收成自己那一域的形状（判据放在域文件里，不放这里）。
 *
 * 入参是**已经解释过的两臂**（`transport` 产的），不是裸值 —— 这样"宿主失败"这一层
 * 不在这里重做一遍（只有一处解释器）。
 */
export function typedOutcome<T>(
  outcome: JsxOutcome<unknown>,
  decode: Decoder<T>,
  label: string,
): JsxOutcome<T> {
  if (outcome.status !== 'ok') return outcome

  const decoded = decode(outcome.data)
  if (isDecodeFail(decoded)) {
    return { status: 'error', fail: 'PARSE', reason: `${label}: ${failCode(decoded)}` }
  }
  return { status: 'ok', data: decoded.value }
}

/** `DecodeFail` → 无中文的短码：`notJson` / `shape.top(expected=array)` / `badItem(3)` */
function failCode(fail: DecodeFail): string {
  switch (fail.fail) {
    case 'shape':
      return `shape.${fail.field || 'top'}(expected=${fail.expected})`
    case 'badItem':
      return fail.count === undefined ? 'badItem' : `badItem(${fail.count})`
    case 'noItemsParsed':
      return `noItemsParsed(${fail.count})`
    default:
      return fail.fail
  }
}
