/**
 * 数据仓库接口。**所有持久化都必须经过它**（ADR-15）。
 *
 * 三条规则：
 * - 读：失败返回 `{ ok: false, reason }`，不许用假数据冒充真数据（ADR-14）
 * - 写：失败必须抛，调用方要能看见
 * - 每个文件一条串行队列：连点两次收藏不能丢更新
 */

/**
 * 读结果：判别联合。
 *
 * `ok: false` 分支**结构上没有 `value`**——想用数据就必须先处理"坏了怎么办"，
 * 不许像以前那样 `read.value` 直接取（旧形状 `{ value, degraded? }` 允许忽略 `degraded`）。
 * `reason` 是给 UI 看的短句（文件损坏 / 读取失败 / 结构不认识）。
 */
export type RepoRead<T> = { ok: true; value: T } | { ok: false; reason: string }

export interface Repo<T> {
  /** 读；文件不存在时返回 fallback，且 `ok: true`（首次使用是正常状态） */
  read(): Promise<RepoRead<T>>
  /** 覆写；失败抛 */
  write(value: T): Promise<void>
  /** 读 → 改 → 写，同一文件的调用严格串行；失败抛 */
  update(mutator: (value: T) => T | void): Promise<T>
  /** 写成功后通知；用于 store 保持只读投影 */
  onChange(listener: (value: T) => void): () => void
}
