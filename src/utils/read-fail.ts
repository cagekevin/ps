// 是什么：「这份数据为什么不可用」的唯一形状 —— 观测受阻（`ReadFailure`）+ 内容不可用（`ReadFail`）
// 唯一入口：`ReadFailure` / `ReadFail` 只在这里定义；别处一律 import，不许各写一套子码
// 替代了什么：`cep/fs-read.ts` 里的同名定义已迁出，`fs-read` 只 re-export（读原语仍在那）
// 谁在用：`cep/fs-read`（生产）· `cep/data/{types,repo-read}` · `cloud/types` · `domain/cloud` · `utils/exists`
// 禁止：这里不写用户文案（`describeReadFailure` 只出技术原文）；用户话归 `msg`

/**
 * 观测失败：**观测被什么挡住**（不是"内容为什么不可用"）。
 *
 * - `errno`：系统 errno（`EPERM`/`EACCES`/`EBUSY`/`ENOSPC`…）或 jsx 侧的 `JSX`；`raw` 是原始现场；
 * - `noNode`：没开 `--enable-nodejs`；
 * - `noCep`：既没有 Node 也没有 CEP 桥 —— 两条路都断；
 * - `pathEscape`：目录守卫没过（`target` + 哪条守卫），**话由消费方说**。
 */
export type ReadFailure =
  | { kind: 'errno'; code: string; raw: unknown }
  | { kind: 'noNode' }
  | { kind: 'noCep' }
  | { kind: 'pathEscape'; guard: 'ownDir' | 'outsideDir'; target: string }

/**
 * **「这份数据为什么不可用」的唯一定义**：读盘失败（有现场）/ 内容失败（无现场）。
 *
 * 仓库结论、台账、系统字体、云端快照的失败臂都用这一份 —— 各写一遍会长出
 * "有的带 `failure` 有的不带"的缝，而那种缝**不报错**，只是安静地少一个字段。
 */
export type ReadFail =
  { fail: 'readError'; failure: ReadFailure } | { fail: 'notJson' | 'badShape' }

/**
 * **失败臂的唯一一份**：为什么不可用（`ReadFail`）+ 给用户的那句话。
 *
 * 仓库结论（`RepoReadBad`）、三态结论（`Exists`）、台账、系统字体、云端快照共用它 ——
 * 各写一遍会长出"这层带 `failure`、那层不带"的缝，而那种缝**不报错**，只是安静地少一个字段。
 */
export type Bad = { status: 'error'; reason: string } & ReadFail

/**
 * 观测失败 → 一行**技术原文**（给日志与诊断，**不是**用户文案）。
 *
 * `switch` 完备：新增 `kind` 而这里不补分支 ⇒ 编译不过。这是"唯一渲染处"的类型保证。
 */
export function describeReadFailure(f: ReadFailure): string {
  switch (f.kind) {
    case 'errno':
      return typeof f.raw === 'string' ? f.raw : f.raw instanceof Error ? f.raw.message : f.code
    case 'noNode':
      return 'NO_NODE：没有 --enable-nodejs'
    case 'noCep':
      return 'NO_CEP：既没有 Node 也没有 CEP 桥'
    case 'pathEscape':
      return `PATH_ESCAPE(${f.guard})：${f.target}`
  }
}
