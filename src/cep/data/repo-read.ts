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
// 折叠：`foldAbsent(outcome, fallback)` —— **纯函数**，把 `absent` 折成 `ok:true + fallback()`。
//   它不是第二个入口：无 IO、无判断，只做一次映射。**"文件不在"怎么处理只在这里决定一次。**
// 为什么折叠必须能单独存在：台账 / 系统字体**没有默认值** —— 拿 `{rev:0}` 顶"没有台账"正是 T-114 的 bug。
//   给它们硬塞一个 `fallback` 参数 = 往签名里塞谎言，所以折叠不做进入口。
//
// 别这么写：自己 `readTextSync` / `readTextAsync` + `JSON.parse` + 当数据用。那会绕过 `decode`，
//   于是"文件坏了"在页面上表现为"空面板"（T-101-1 的原始症状）。
//
// 判据边界（ADR-26 ②）：本文件**只**做"磁盘内容能不能当 T 用"这一个判断。
//   "文件系统说了什么"（`ok/notSeen/error`）由 `cep/fs-read` 的 `classifyFsError` 定，本文件不重判。

import { readTextSync } from '../fs-read'
import { log } from '@/utils/logger'
import { msg } from '@/domain/messages'
import { isDecodeFail, type Decoder } from '@/utils/decode'
import type { RepoRead } from './types'

/**
 * 档 1 的**结论**（三态）。每一臂都带 `text`，所以取原文做 CAS 比对不用分支。
 *
 * 为什么必须是三态而不是 `RepoRead` 的两臂：`RepoRead` 把"文件不在"折成 `ok:true + fallback()`。
 * 对**有默认值**的数据文件（动作库、色板、分类）这是对的 —— 首次使用就是空数据。
 * 但对**没有默认值**的文件（同步台账、系统字体列表），"文件不在"是**另一个结论**
 * （还没有同步过 / 还没生成过）。拿默认值顶上去会把"读不到"和"没有"混成一件事
 * （T-114 / TD-09-3 的原始症状）。需要两臂的调用方用 `foldAbsent` 折。
 */
export type RepoFileOutcome<T> =
  | { kind: 'ok'; value: T; text: string; degraded?: string }
  /** 文件系统明确说那个路径上没有东西（只认 `ENOENT`） */
  | { kind: 'absent'; text: null }
  /**
   * 读不到 / 不是合法 JSON / 结构不认识 —— 三者都到这里。
   *
   * `why` 是**给消费方分文案用的判别位**，不是调试字段：色板要区分「不是合法 JSON」与
   * 「根不是数组」（两句不同的话）；台账/系统字体要区分「读不到」与「读不懂」。
   * 拿 `reason` 做字符串比较来分档是脆的，所以单列这个位。
   */
  | {
      kind: 'bad'
      why: 'readError' | 'notJson' | 'badShape'
      reason: string
      text: string | null
    }

/**
 * **档 1 的唯一读入口**。四种结局各自一条出路（不许合并）：
 *
 * | 观测 | 结论 | 为什么不能合并 |
 * |---|---|---|
 * | `error`（EPERM / 坏盘） | `bad` + reason | 读不到 ≠ 首次使用：拿默认值写回会覆盖用户文件（D-42 / T-105） |
 * | `notSeen`（只认 ENOENT） | `absent` | 是"没有这个文件"，不是"文件是空的" |
 * | 文本不是 JSON | `bad` + reason | 坏文件必须能看见，不能变成"空面板"（T-101-1） |
 * | JSON 但 `decode` 不认 | `bad` + reason | 结构不认识 ≠ 文件不存在，两者要能分辨 |
 *
 * 读失败一律 `log.error`（开发者看 logger）+ 结论里带 reason（用户看 UI 状态），两处都有信号。
 */
export function readRepoFile<T>(target: string, decode: Decoder<T>): RepoFileOutcome<T> {
  const outcome = readTextSync(target)

  if (outcome.status === 'error') {
    log.error('repo', `${target} 读取失败`, outcome.reason)
    return {
      kind: 'bad',
      why: 'readError',
      reason: msg.data.fn.readFailed(outcome.reason),
      text: null,
    }
  }

  if (outcome.status === 'notSeen') return { kind: 'absent', text: null }

  const text = outcome.text
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    log.error('repo', `${target} 不是合法 JSON`, e)
    return { kind: 'bad', why: 'notJson', reason: '内容不是合法 JSON', text }
  }

  // 唯一的形状通道：`decode` 是必填参数，解析结果没有"直接当 T"这条路
  const decoded = decode(parsed)
  if (decoded === null) {
    log.error('repo', `${target} 内容结构不认识`)
    return { kind: 'bad', why: 'badShape', reason: '内容结构不认识', text }
  }
  // `decode` 说清了哪里坏 ⇒ 用它的文案（各仓库的用户提示不同，不许在这里统一成一句）
  if (isDecodeFail(decoded)) {
    log.error('repo', `${target} 内容结构不认识：${decoded.fail}`)
    return { kind: 'bad', why: 'badShape', reason: decoded.fail, text }
  }

  // 值可用但不完整 → 带上 degraded（ADR-14：读可降级但必须标记）
  return decoded.degraded
    ? { kind: 'ok', value: decoded.value, text, degraded: decoded.degraded }
    : { kind: 'ok', value: decoded.value, text }
}

/** 折叠时可选的差异。只有一处真差异，不是"万能开关"：见 `notSeenReason`。 */
export interface FoldOptions {
  /**
   * `classification.json` 不随面板分发，首次使用确实没有 —— 它要 `ok:true` **+ 一句 reason**
   * （去掉 reason 就是静默回退，硬规则 20(b)）。其余仓库不要。
   */
  notSeenReason?: string
}

/**
 * **把三态折成两臂**（纯函数，无 IO、无判断）。
 *
 * `absent` → `ok:true` + `fallback()`：首次使用是**正常状态**，不是失败（ADR-26 ②）。
 * `bad` → `ok:false` + `reason` + `fallback()`（`fallback` 是生产者给的默认值，消费侧不许自己再造）。
 *
 * **"文件不在就顶上默认值"这件事只在这里决定一次** —— 12 个有默认值的仓库都调它，
 * 谁也不许在自己文件里再写一遍 `kind === 'absent' ? fallback() : …`。
 * 没有默认值的文件（台账 / 系统字体）**不调它**，直接看 `kind`。
 */
export function foldAbsent<T>(
  outcome: RepoFileOutcome<T>,
  fallback: () => T,
  opts: FoldOptions = {},
): RepoRead<T> {
  switch (outcome.kind) {
    case 'absent':
      return opts.notSeenReason
        ? { ok: true, value: fallback(), reason: opts.notSeenReason }
        : { ok: true, value: fallback() }
    case 'bad':
      return { ok: false, reason: outcome.reason, fallback: fallback() }
    case 'ok':
      return outcome.degraded
        ? { ok: true, value: outcome.value, reason: outcome.degraded }
        : { ok: true, value: outcome.value }
  }
}
