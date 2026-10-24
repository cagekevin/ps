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
   * 目前两处会这么返回，都在 `classification-repo.ts`：
   * - 「分类数据里没有可用分组」：文件是合法 JSON，只是 `categories` 为空——把整份 `value`
   *   降成 `ok: false` 会连 `presets` / `commercials` 一起丢掉（字体管理页的"免费商用"
   *   筛选会跟着空），所以留这个口子。
   * - 「分类数据文件不存在」（T-103）：与 `file-repo.ts:71-72`「文件不存在是首次使用的正常
   *   状态，不算读失败」同一条规则。原版 `app.v4.js:45717-45721` 对 `ENOENT` 也是去下载、
   *   不报错；`classification.json` 不随面板分发（`getClassificationURL` → `v1/font/link`，
   *   `:49501`），首次使用真的不存在。值给空分类，但 reason 保留——不留就是静默回退（20(b)）。
   * **其余仓库一律 `ok: false` 表示"`value` 不可用"**；新增 `ok: true` + `reason` 要先证明
   * "丢掉 value 就是功能变化"。
   */
  reason?: string
}

/**
 * 读失败：磁盘上的内容不能当数据用（类型上取不到 `value`）。
 *
 * `fallback` 是**仓库自己规定的默认值**，由 `fileRepo(resolvePath, fallback)` 的
 * `fallback()` 产生（`file-repo.ts:36`）——与"文件不存在"（`file-repo.ts:72`）**同一个来源**。
 * 消费侧要展示时取它，不许自己再写一份默认值（ADR-24 / 硬规则 20）。
 *
 * 代价（ADR-14 扩展二）：`fallback` 与"文件不存在"在**值上不可分辨**，
 * 要区分只能看 `ok`——所以 `ok` 是唯一判别位，不是调试字段。
 */
export interface RepoReadBad<T> {
  ok: false
  reason: string
  fallback: T
}

/**
 * 判别联合：取 `.value` 前必须先判 `ok`；坏读时展示 `fallback`（生产者给的）。
 *
 * 两臂各自带值，所以消费侧写 `read.ok ? read.value : read.fallback` 一行就够：
 * 不传默认值、不写 `if (!ok) return []`，也不需要中间的折叠层（`read-or.ts` 已删，T-102）。
 */
export type RepoRead<T> = RepoReadOk<T> | RepoReadBad<T>

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
