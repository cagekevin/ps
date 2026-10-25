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

/**
 * **store 唯一能拿到的仓库形状**：只有读侧。
 *
 * 为什么是类型而不是一道闸（目标架构 §4.7「写用户资产」）：store 里写 repo.write(...) 时
 * 这个类型上**根本没有那个方法** —— vue-tsc 报 TS2339，不需要任何扫描脚本
 * （原 layer-boundary.mjs 规则 L1 已删）。写侧叫 <域>Writer（同一对象，类型是全量 Repo<T>），
 * 只给 commands / cloud 用；eslint 禁 store 导入那个名字。
 */
export type RepoView<T> = Pick<Repo<T>, 'read' | 'onChange'>

export interface Repo<T> {
  /** 读；文件不存在时返回 fallback，且**不算**失败（首次使用是正常状态） */
  read(): Promise<RepoRead<T>>
  /** 覆写；失败抛 */
  write(value: T): Promise<void>
  /**
   * **整份覆盖 + 保留原文做备份/隔离**；失败抛。与另两个写的区别：
   * - `write` 不看原文（`previous` 恒 `null`）⇒ 拿不到原文就没有 `.bak`；
   * - `update` 在原文坏时**拒绝写**（D-42），而"整份替换"要的正是**读坏也写**、
   *   但把坏原文隔离到 `.corrupt-<ts>`（TD-09-21，不让坏内容顶 `.bak`）。
   * 不带 CAS（整份覆盖：调用方已决定完整内容，没有"读→改→写"的丢更新窗口）。
   *
   * 消费者：`swatch-repo.writeSwatchItems`（已迁）。
   * 待迁（下一步）：`cloud/entries/action-library.ts:109` 云下载把原文落盘 —— 它现在直写
   * `writeTextFileAtomic`，无 `.bak`、不 emit（债 11-24）。**不要把这条读成"已迁"**。
   */
  overwrite(value: T): Promise<void>
  /**
   * 与 `overwrite` 相同，但**不排队**：调用方必须已持有 `data/write-queue` 的锁。
   * `swatch-repo.writeSwatchItems` 的 6 个调用方全在 `runQueued` 任务体里，用这个。
   */
  overwriteInLock(value: T): Promise<void>
  /**
   * 与 `write` 相同，但**不排队**：调用方必须已持有 `data/write-queue` 的锁。
   * 用在"写 N 个库文件 + 写索引"这类要独占一段的事务里——已在锁内再排一次队会自锁。
   */
  writeInLock(value: T): Promise<void>
  /**
   * 与 `read` 相同，但**不排队**：调用方必须已持有 `data/write-queue` 的锁。
   *
   * 这是 `writeInLock` 的另一半：锁内的读也必须走"不排队"版本，否则读一次就把队列
   * 自己排在了自己后面 → 自锁（`write-queue.ts:6` 的禁令）。不排队读本身安全：
   * 写是原子 rename，读到的要么是旧值要么是新值，不会看到半截。
   */
  readInLock(): Promise<RepoRead<T>>
  /** 读 → 改 → 写，同一文件的调用严格串行；失败抛 */
  update(mutator: (value: T) => T | void): Promise<T>
  /**
   * 与 `update` 相同（读→改→写 + 落盘前 CAS 比对），但**不排队**：调用方必须已持有写队列锁。
   * 锁内的索引读改写用它——保留 CAS（跨进程仍可能被另一面板改过），又不会自己排自己。
   */
  updateInLock(mutator: (value: T) => T | void): Promise<T>
  /** 写成功后通知；用于 store 保持只读投影 */
  onChange(listener: (value: T) => void): () => void
}
