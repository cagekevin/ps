import type { CasMode } from '@/cep/disk-write'
import type { Bad } from '@/utils/read-fail'

export type { Bad }

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
 * - 读：坏文件不许冒充真数据——**判别联合**，`status: 'error'` 时类型上取不到 `value`（T-101-2）
 * - 写：失败必须抛，调用方要能看见
 * - 每个文件一条串行队列：连点两次收藏不能丢更新
 */

/**
 * 读成功：`value` 是磁盘上的真实数据。
 *
 * **谁能造它**：`foldAbsent`（`repo-read.ts`）+ 11 处"文件不在给空"的分支
 * （`swatch-repo` 3 · `style-library-repo` 3 · `legacy-settings` 2 · `font-meta` 1 ·
 * `classification-repo` 1 · `foldAbsent` 自己 1）。`ok` 臂可以直造：它没有可选字段，
 * 不存在"忘带字段"的静默降级 —— 需要收口的只有失败臂。
 */
export interface RepoReadOk<T> {
  /**
   * 判别位。**读链域全仓一份**（观测层 / 判据层 / 业务层都用它 + 同一套取值词表
   * `ok` / `notSeen` / `error`）。
   *
   * 用枚举而不是布尔，是为了能承载第三态（`notSeen`）；布尔只能"成 / 不成"。
   * **本形状只有两臂**：`notSeen` 是"首次使用"的正常状态，折成 `ok` + `fallback()`。
   * 需要把"没有这份数据"与"有"分开的形状（台账 / 系统字体 / 云端快照）各自保留
   * 独立的 `notSeen` 臂 —— 那是**另一个问题**（有没有 ≠ 能不能当默认值用）。
   */
  status: 'ok'
  value: T
}

/**
 * 仓库结论的失败臂 = 失败内容 + 本层的 `fallback`。
 *
 * `fallback` 是**仓库自己规定的默认值**，由 `fileRepo(resolvePath, fallback)` 的
 * `fallback()` 产生 —— 与缺席折成 `ok` 时用的是同一个来源。消费侧要展示时取它，
 * 不许自己再写一份默认值（ADR-0024）。
 *
 * **谁能造它**：只有 `repo-read.ts` 的三个工厂 —— `badRead`（读盘失败，**必带现场**）·
 * `badContent`（内容失败，**没有 `failure` 字段**）· `rebad`（换 payload 类型，字段一个不丢）。
 * 别处不许写 `{ status:'error', … }` 字面量：手写这一臂最容易把 `failure` 忘掉，而忘掉**不会报错**。
 */
export type RepoReadBad<T> = Bad & { fallback: T }

/**
 * 判别联合：取 `.value` 前必须先判 `status`；坏读时展示 `fallback`（生产者给的）。
 *
 * 两臂各自带值，所以消费侧写 `read.status === 'ok' ? read.value : read.fallback` 一行就够：
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
