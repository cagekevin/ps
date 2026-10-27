// 是什么｜替代了什么｜谁在用
// 是什么：**档 1（面板数据文件）的唯一读入口** —— 三态观测 → JSON.parse → `decode`（必填）→ 三态结论；
//   另有一个**纯折叠函数**把"文件不在"折成默认值（无 IO、无判断）
// 替代了什么：`file-repo.ts:62-101` 内联的 `readRaw`，以及 11 个仓库各自写的
//   `readTextAsync` + `JSON.parse` + 自己的校验（那正是"10 种读结果形状"的来源）
// 谁在用：`data/file-repo.ts`、`data/classification-repo.ts`、`cloud/ledger.ts`，
//   以及逐个迁进来的 `data/{sys-font,swatch-repo,legacy-settings,style-library-repo,common-use}.ts`
//
// ── 一份判据、一个入口、一个折叠 ────────────────────────────────────────────────
// 入口：`readRepoFile(target, decode)` —— **只有一个**。`decode` 必填 ⇒「把 JSON.parse 的结果直接当 T」写不出来。
// 折叠：`foldAbsent(outcome, fallback)` —— **纯函数**，`notSeen` 折成 `ok` + `fallback()`。
//   它不是第二个入口：无 IO、无判断，只做一次映射。**"文件不在"给什么值只在这里决定一次。**
// 为什么折叠必须能单独存在：台账 / 系统字体**没有默认值** —— 拿 `{rev:0}` 顶"没有台账"正是 T-114 的 bug。
//   给它们硬塞一个 `fallback` 参数 = 往签名里塞谎言，所以折叠不做进入口。
//
// 别这么写：自己 `readTextSync` / `readTextAsync` + `JSON.parse` + 当数据用。那会绕过 `decode`，
//   于是"文件坏了"在页面上表现为"空面板"（T-101-1 的原始症状）。
//
// 判据边界（ADR-26 ②）：本文件**只**做"磁盘内容能不能当 T 用"这一个判断。
//   "文件系统说了什么"（`ok/notSeen/error`）由 `cep/fs-read` 的 `classifyFsError` 定，本文件不重判。

import { describeReadFailure, readTextSync, type ReadFail, type ReadFailure } from '../fs-read'
import { log } from '@/utils/logger'
import { msg } from '@/domain/messages'
import { isDecodeFail, type DecodeFail, type Decoder } from '@/utils/decode'
import type { RepoRead, RepoReadBad } from './types'
import { CepError } from '@/utils/errors'

/**
 * 档 1 的**结论**（三态）。每一臂都带 `text`，所以取原文做 CAS 比对不用分支。
 *
 * 为什么它比 `RepoRead` 多一个 `text`：`RepoRead` 是**结论**，不带原文；
 * 本形状是 `readRepoFile` 内部的中间站 —— 写完回读 / CAS 比对要的是原文。
 * 两者的三态语义相同，`foldAbsent` 是唯一转换处。
 */
export type RepoFileOutcome<T> =
  | { status: 'ok'; value: T; text: string }
  /** 文件系统明确说那个路径上没有东西（只认 `ENOENT`） */
  | { status: 'notSeen'; text: null }
  /**
   * 读不到 / 不是合法 JSON / 结构不认识 —— 三者都到这里。
   *
   * `why` 是**给消费方分文案用的判别位**，不是调试字段：色板要区分「不是合法 JSON」与
   * 「根不是数组」（两句不同的话）；台账/系统字体要区分「读不到」与「读不懂」。
   * 拿 `reason` 做字符串比较来分档是脆的，所以单列这个位。
   */
  | ({ status: 'error'; reason: string; text: string | null } & ReadFail)

/**
 * **档 1 的唯一读入口**。四种结局各自一条出路（不许合并）：
 *
 * | 观测 | 结论 | 为什么不能合并 |
 * |---|---|---|
 * | `error`（EPERM / 坏盘） | `error` + reason | 读不到 ≠ 首次使用：拿默认值写回会覆盖用户文件（D-42 / T-105） |
 * | `notSeen`（只认 ENOENT） | `notSeen` | 是"没有这个文件"，不是"文件是空的" |
 * | 文本不是 JSON | `error` + reason | 坏文件必须能看见，不能变成"空面板"（T-101-1） |
 * | JSON 但 `decode` 不认 | `error` + reason | 结构不认识 ≠ 文件不存在，两者要能分辨 |
 *
 * 读失败一律 `log.error`（开发者看 logger）+ 结论里带 reason（用户看 UI 状态），两处都有信号。
 */
export function readRepoFile<T>(target: string, decode: Decoder<T>): RepoFileOutcome<T> {
  const outcome = readTextSync(target)

  if (outcome.status === 'error') {
    // 日志收观测结构本身（`kind` + errno + 原始错误），不经任何人的翻译
    log.error('repo', `${target} 读取失败`, outcome.failure)
    return {
      status: 'error',
      fail: 'readError',
      reason: msg.data.fn.readFailed(describeReadFailure(outcome.failure)),
      text: null,
      failure: outcome.failure,
    }
  }

  if (outcome.status === 'notSeen') return { status: 'notSeen', text: null }

  const text = outcome.value
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    log.error('repo', `${target} 不是合法 JSON`, e)
    // 文案走**唯一渲染处**（判据 3）：这里只报"不是合法 JSON"这个码，中文由 `describeDecodeFail` 出
    return {
      status: 'error',
      fail: 'notJson',
      reason: describeDecodeFail({ fail: 'notJson' }),
      text,
    }
  }

  // 唯一的形状通道：`decode` 是必填参数，解析结果没有"直接当 T"这条路。
  // 它也**不返回 `null`**（`Decoder<T>` 只允许 `Decoded<T> | DecodeFail`）——
  // 所以这里不存在"失败但说不出原因"的分支，`reason` 一定是 decode 给的。
  const decoded = decode(parsed)
  // `decode` 说清了哪里坏 ⇒ 用它的文案（各仓库的用户提示不同，不许在这里统一成一句）
  if (isDecodeFail(decoded)) {
    // **`DecodeFail` 的唯一渲染处**：decode 层只报观测（字段/期望/实际）或码，
    // 用户话只从这里出、只从 `msg` 取 —— 12 个 decoder 不再各写一句中文。
    // `reason` 是**给用户**的那句（`describeDecodeFail` 是 UI 文案生成器）；
    // 日志要的是观测对象本身（`{ fail, field, expected, received }`），原样进 detail ⇒
    // `logger.oneLine` 会把它序列化成结构化的失败现场，不需要任何人翻译。
    const reason = describeDecodeFail(decoded)
    log.error('repo', `${target} 内容结构不认识`, decoded)
    return { status: 'error', fail: 'badShape', reason, text }
  }

  return { status: 'ok', value: decoded.value, text }
}

/**
 * **把三态折成两臂**（纯函数，无 IO、无判断）。读模型的唯一折法。
 *
 * - `ok` → `status:'ok'` + `value`
 * - `notSeen` → `status:'ok'` + `fallback()`：文件本来就不存在是**正常状态**（ADR-26 ②）
 * - `error` → `status:'error'` + `reason` + `fallback()`
 *
 * **"缺席给什么默认值"只在这里决定一次** —— 有默认值的仓库都调它，
 * 谁也不许在自己文件里再写一遍 `status === 'notSeen' ? fallback() : …`。
 *
 * 没有「值可用但不完整」这一臂：读不懂就是 `error`，半成品值不许流到业务层。
 */
/**
 * 造失败臂的**唯一入口（读盘失败）**：`fail:'readError'` **必带现场**。
 *
 * 别处不许写 `{ status:'error', fail:'readError', … }` 字面量 —— 手写这一臂最容易
 * 把 `failure` 忘掉，而忘掉**不会报错**（少个可选字段而已，现在字段必填才报）。
 */
export function badRead<T>(reason: string, fallback: T, failure: ReadFailure): RepoReadBad<T> {
  return { status: 'error', fail: 'readError', reason, fallback, failure }
}

/**
 * 造失败臂的**唯一入口（内容失败）**：不是合法 JSON / 结构不认识。
 *
 * 这两种**没有系统错误可带**，所以这一臂上不存在 `failure` 字段 —— 不是"可选"，是"没有"。
 */
export function badContent<T>(
  fail: 'notJson' | 'badShape',
  reason: string,
  fallback: T,
): RepoReadBad<T> {
  return { status: 'error', fail, reason, fallback }
}

/**
 * 把**另一个**失败的 `RepoRead` 重包成新 payload 类型（只换 `fallback` 的类型）。
 *
 * 唯一用途是"`fallback` 类型变了"。**字段一个不丢** —— 手写这个重包是本仓最容易
 * 悄悄丢掉 `failure` 的地方（`readError` 的现场会整段消失，而且不报错）。
 */
export function rebad<T>(src: RepoReadBad<unknown>, fallback: T): RepoReadBad<T> {
  return src.fail === 'readError'
    ? { status: 'error', fail: 'readError', reason: src.reason, fallback, failure: src.failure }
    : { status: 'error', fail: src.fail, reason: src.reason, fallback }
}

export function foldAbsent<T>(outcome: RepoFileOutcome<T>, fallback: () => T): RepoRead<T> {
  switch (outcome.status) {
    case 'notSeen':
      return { status: 'ok', value: fallback() }
    case 'error':
      // 折叠也走工厂：**失败臂的字面量只在 `badRead` / `badContent` 里**，这里不重写一遍
      return outcome.fail === 'readError'
        ? badRead(outcome.reason, fallback(), outcome.failure)
        : badContent(outcome.fail, outcome.reason, fallback())
    case 'ok':
      return { status: 'ok', value: outcome.value }
  }
}

/**
 * 只要原文（不过 decode）时的唯一入口：文件不在 ⇒ `null`，读不到 ⇒ 抛。
 *
 * 给"本来就可能没有这个文件"的路径用（导出时按索引逐个读库文件、删仓库时枚举图片名）。
 */
export function readTextForWrite(target: string): string | null {
  const read = readTextSync(target)
  if (read.status === 'ok') return read.value
  if (read.status === 'notSeen') return null
  throw new CepError(
    'IO',
    msg.data.fn.fileReadFailedAbortWrite(target, describeReadFailure(read.failure)),
    undefined,
    read.failure,
  )
}

/**
 * `DecodeFail` 的**唯一渲染处**（两个消费者：本文件 + `cloud/entries/*` 的云载荷内层）。
 *
 * 形状臂拼「字段 / 期望 / 实际」；语义臂按码取文案。decode 层因此不需要知道
 * "用户该看到什么" —— 它只报它真正知道的东西（哪个字段不对，或者内容空/没解析出条目）。
 * 消费者变多不改变"唯一渲染处"：**中文只从这里出**，别处只传码。
 */
export function describeDecodeFail(fail: DecodeFail): string {
  if (fail.fail === 'shape') {
    return msg.data.fn.decodeShapeFail(fail.field, fail.expected, fail.actual)
  }
  const count = String(fail.count ?? '')
  switch (fail.fail) {
    case 'notJson':
      return msg.data.fn.decodeNotJson()
    case 'emptyContent':
      return msg.data.fn.decodeEmptyContent()
    case 'noItemsParsed':
      return msg.data.fn.decodeNoItemsParsed(count)
    case 'badItem':
      return msg.data.fn.decodeBadItem(count)
  }
}
