/**
 * 数据仓库接口。**所有持久化都必须经过它**（ADR-15）。
 *
 * 三条规则：
 * - 读：失败可回退默认值，但必须带 `degraded`，不许用假数据冒充真数据（ADR-14）
 * - 写：失败必须抛，调用方要能看见
 * - 每个文件一条串行队列：连点两次收藏不能丢更新
 */

export interface RepoRead<T> {
  value: T
  /** 非空表示读到的不是真实数据（文件损坏 / 读取失败），UI 应提示 */
  degraded?: string
}

export interface Repo<T> {
  /** 读；文件不存在时返回 fallback，且**不算** degraded（首次使用是正常状态） */
  read(): Promise<RepoRead<T>>
  /** 覆写；失败抛 */
  write(value: T): Promise<void>
  /** 读 → 改 → 写，同一文件的调用严格串行；失败抛 */
  update(mutator: (value: T) => T | void): Promise<T>
  /** 写成功后通知；用于 store 保持只读投影 */
  onChange(listener: (value: T) => void): () => void
}
