import type { CasMode } from '@/cep/disk-write'

/**
 * `Repo.replace` 拿不到 CAS 基准时的**统一表态**。
 *
 * 为什么要有这个常量：`Repo.read()` 返回 `RepoRead`，**不含原文**；整份替换的调用点
 * （动作索引、样式索引、库分组、色板、四个云写回）因此拿不到 `expected`。
 * 9 处各写一句 `why` 就是同一份事实写 9 遍（刀 7）。要真正比对，得让 `Repo` 记住
 * "上一次读到的原文" —— 那是另一个设计（缺口见 `18-横切-写落盘-收口-2026-10-26.md` §6）。
 */
export const REPLACE_WITHOUT_BASELINE: CasMode = {
  mode: 'skip',
  why: '整份替换；CAS 基准原文不在 Repo.read 上',
}

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
 * 消费侧要展示时取它，不许自己再写一份默认值（ADR-0024）。
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
 * 。写侧叫 <域>Writer（同一对象，类型是全量 Repo<T>），
 * 只给 commands / cloud 用；eslint 禁 store 导入那个名字。
 */
export type RepoView<T> = Pick<Repo<T>, 'read' | 'onChange'>

export interface Repo<T> {
  /**
   * 读；文件不存在时返回 fallback，且**不算**失败（首次使用是正常状态）。
   *
   * **同步**：写原语是 `renameSync`，本来就同步；读跟着同步之后，
   * 「读 → 改 → 写」是一个不可被打断的同步段 —— 串行队列因此没有存在理由。
   */
  read(): RepoRead<T>
  /**
   * 整份替换：**备份恒定开 + 读不到原文就抛（D-42）**，CAS 由调用方表态。
   *
   * 合并了旧的两个写口：
   * - `write`（不读原文、不备份、不比）—— 「忘了比」与「决定不比」在类型上同形；
   * - `overwrite`（有备份、不比）—— 旧注释写「整份覆盖没有丢更新窗口」，**这句是错的**：
   *   整份内容恰恰是基于"我刚才读到的那一份"算出来的，别人在读写之间改过就该拒。
   *
   * 现在只有一个写口、`cas` 必填 ⇒ 每个调用点必须表态（`compare` 或 `skip` + 理由）。
   * `update` 是另一件事（读→改→写 + 重试），不并入。
   */
  replace(value: T, cas: CasMode): void
  /**
   * 读 → 改 → 写（含落盘前 CAS 比对 + 重试）；失败抛。
   *
   * **同步**：整段不可被打断。跨进程仍可能被另一个面板改过，那是 CAS 的事
   * （`compareSync` 比对失败 → 重读重跑 mutator），不是队列的事。
   * `mutator` 因此必须**幂等** —— 重试时会拿新值再跑一遍。
   */
  update(mutator: (value: T) => T | void): T
  /** 写成功后通知；用于 store 保持只读投影 */
  onChange(listener: (value: T) => void): () => void
}
