/**
 * 数据仓库接口。**所有持久化都必须经过它**（ADR-15）。
 *
 * 三条规则：
 * - 读：坏文件不许冒充真数据——**判别联合**，`ok: false` 时类型上取不到 `value`（T-101-2）
 * - 写：失败必须抛，调用方要能看见
 * - 每个文件一条串行队列：连点两次收藏不能丢更新
 */

/** 读成功：`value` 是磁盘上的真实数据 */
export interface RepoReadOk<T> {
  ok: true
  value: T
  /**
   * 非空 = `value` **可用但不完整**，UI 仍要提示。
   *
   * 只有 `classification-repo.ts` 的「分类数据里没有可用分组」会这么返回：文件是合法 JSON，
   * 只是 `categories` 为空——把整份 `value` 降成 `ok: false` 会连 `presets` / `commercials`
   * 一起丢掉（字体管理页的"免费商用"筛选会跟着空），所以留这个口子。
   * **其余仓库一律 `ok: false` 表示"`value` 不可用"**；新增 `ok: true` + `reason` 要先证明
   * "丢掉 value 就是功能变化"。
   */
  reason?: string
}

/** 读失败：磁盘上的内容不能当数据用（`value` 是 fallback，类型上取不到） */
export interface RepoReadBad {
  ok: false
  reason: string
}

/**
 * 判别联合：取 `.value` 前必须先判 `ok`。
 *
 * 纯展示处（坏了就等于"这份数据不存在"）不要各写 `if (!ok) return []`——
 * 那是把兜底从 `?? []` 搬成 `if (!ok) return []`。走 `read-or.ts` 的 `readOr`，
 * 名单见 `docs/生成/RepoRead消费方清单.md` §二。
 */
export type RepoRead<T> = RepoReadOk<T> | RepoReadBad

export interface Repo<T> {
  /** 读；文件不存在时返回 fallback，且**不算**失败（首次使用是正常状态） */
  read(): Promise<RepoRead<T>>
  /** 覆写；失败抛 */
  write(value: T): Promise<void>
  /** 读 → 改 → 写，同一文件的调用严格串行；失败抛 */
  update(mutator: (value: T) => T | void): Promise<T>
  /** 写成功后通知；用于 store 保持只读投影 */
  onChange(listener: (value: T) => void): () => void
}
