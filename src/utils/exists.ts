// 是什么：「有没有这份数据」的唯一形状 —— ok 有 / notSeen 没有 / error 坏了
// 唯一入口：台账（有没有同步过）· 系统字体（有没有生成过）· 云端快照（云端有没有）只许用这一个形状
// 替代了什么：`SysFontRead` / `LedgerRead` / `CloudPullOutcome` 三份同形定义已删，现由本文件负责
// 谁在用：`cep/data/sys-font` · `cloud/types` · `domain/cloud`
// 禁止：这里不带默认值 —— 拿空值冒充"没有"会把我们的故障说成用户的数据（T-114）。
//   有默认值的数据文件用 `RepoRead<T>`（缺席折成 `ok` + `fallback`），那是另一个问题。

import type { Bad } from './read-fail'

/**
 * 三态：`ok` 有 / `notSeen` 没有 / `error` 坏了。
 *
 * 判别位只有一个名字（`status`），取值只有这一套词表。失败臂是 `ReadFail`：
 * 只有读盘失败才带 `failure` 现场，内容失败只带子码。
 */
export type Exists<T> =
  | { status: 'ok'; value: T }
  /** 文件系统明确说那个路径上没有东西（只认 `ENOENT`）—— 正常状态，不是失败 */
  | { status: 'notSeen' }
  /** 与仓库结论共用同一个失败臂（`Bad`）：`reason` 给用户，`failure` 给日志 */
  | Bad
