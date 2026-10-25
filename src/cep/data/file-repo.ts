// 是什么：单文件 JSON 仓库的实现（串行队列 + 原子写 + .bak + CAS 比对 + 必填 decode 通道）
// 唯一入口：**不是这里** —— 应用层唯一构造器是 `./data-repo` 的 `dataRepo`（它管环境选择与内存分支）。
//   本文件仍导出 `fileRepo`，只给实现级用例；直接调用绕过的是「环境选择」而**不是**「形状通道」，
//   在无 Node 的浏览器里会抛 `NO_NODE`（**响的**），不会静默写坏数据。
//   ⇒ 这条我判「放弃强声明」：`fileRepo` 是**唯一实现**，不是唯一入口（TS 没有 package-private）。
// **怎么用**：应用层（store / command / 页面）**不要直接调用**，一律 `import { dataRepo } from './data-repo'`。
// **别这么写**：在 store / command / 页面里 `fileRepo(...)` —— 你跳过了环境选择，浏览器 dev 直接炸。
// 替代了什么：`pick.ts` 的可选 `normalize` 参数（TD-03-5 / T-99-2）
// 谁在用（**两具名例外 + 实现级用例**）：
//   ① `data-repo.ts` —— 唯一构造器，环境选择在它那里；
//   ② `swatch-repo.ts` —— **具名例外**：色板是**用户资产**，`dataRepo` 的内存兜底会把"读不到"
//      变成"空色板 + 写入落内存"（静默丢）。这里宁可在无 Node 时抛 `NO_NODE`（响的）；
//   ③ 实现级用例三处：`tests/cep/file-repo.test.ts`（动态 import）、`tests/data/repo.test.ts`（import）、
//      `tests/scripts/data-repo-realfs.test.ts`（夹具字符串，不真 import）。
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { runQueued } from './write-queue'
import { foldAbsent, readRepoFile } from './repo-read'
import { writeDisk } from '@/cep/disk-write'
import { log } from '@/utils/logger'
import type { Decoder } from '@/utils/decode'
import type { Repo, RepoRead } from './types'

// 备份（`.bak` / `.corrupt-*`）与 CAS 比对已抽到 `./disk-write`（唯一落盘入口）——
// 本文件不再自己实现，也不再自己调 `writeTextFileAtomic`。
// `backupOrQuarantine` / `compareSync` 是 `disk-write` 的**内部实现**，不再从这里穿出去 ——
// 上层要落盘只调 `writeDisk` / `writeDiskSync`。

export interface FileRepoOptions {
  /** 写之前把原文备份成 .bak，默认开（ADR-12） */
  backup?: boolean
  /** 文件不存在时 update 直接报错，禁止用 fallback 覆盖写 */
  requireExisting?: boolean
  /** 写前发现文件被别的面板改过时的重试次数，默认 5（D-26） */
  retries?: number
}

/**
 * 单文件 JSON 仓库。
 *
 * 两条并发约束：
 * - 队列是**每个实例一条**：同一文件的所有 update 串行，避免同一实例里
 *   "两次 read 都拿旧值 → 后写覆盖先写"（D-12）。
 * - 队列只管本实例。主面板与独立面板是两个进程、两条队列，所以 `update` 落盘前还要
 *   **重读比对**（D-26）：读 → 改之间对方写过，就丢弃本轮结果、在新值上重跑 mutator。
 *   mutator 因此必须幂等——只依赖入参 file，重复执行结果相同。
 */
export function fileRepo<T>(
  resolvePath: () => string,
  fallback: () => T,
  decode: Decoder<T>,
  opts: FileRepoOptions = {},
): Repo<T> {
  const backup = opts.backup !== false
  const retries = opts.retries ?? 5
  const listeners = new Set<(value: T) => void>()

  function emit(value: T) {
    for (const listener of listeners) listener(value)
  }

  /**
   * 读一次盘。**判据不在这里** —— 三态 → JSON → `decode` → `RepoRead` 全在 `./repo-read`
   * （档 1 的唯一结论入口）。本文件只负责两件它自己才有的事：
   * ① 把 `resolvePath()` 的结果喂进去；② 把原文 `text` 留给 CAS 比对（D-26）。
   */
  function readRaw(): { read: RepoRead<T>; text: string | null } {
    const outcome = readRepoFile(resolvePath(), decode)
    // 折叠只在 `foldAbsent` 里发生一次；本文件只把原文 `text` 留给 CAS（D-26）
    return { read: foldAbsent(outcome, fallback), text: outcome.text }
  }

  /**
   * 落盘。写失败必须抛：这里不做任何兜底（ADR-14）。
   *
   * 返回 `false` = 传了 `expected` 且磁盘原文已经不是它（别的面板改过）。
   * 具体顺序（备份 → CAS → 原子写）在 `./disk-write` 的 `writeDisk` 里，本文件不再重写一遍。
   */
  async function persist(
    value: T,
    previous: string | null,
    expected?: string | null,
    quarantine = false,
  ): Promise<boolean> {
    const result = await writeDisk(resolvePath(), JSON.stringify(value), {
      // `backup` 关掉时不写 `.bak`：显式传 `null` 表示"没有原文"
      previous: backup ? previous : null,
      quarantineOnCorrupt: quarantine,
      expected,
    })
    return result === 'written'
  }

  /**
   * 整份覆盖 + 保留原文做备份/隔离（`overwrite` / `overwriteInLock` 共用这一份）。
   *
   * 与 `rawUpdate` 的区别：`rawUpdate` 在原文坏时**拒绝写**（D-42）；这里**照写**，
   * 但把坏原文隔离到 `.corrupt-<ts>`（TD-09-21）。与 `write` 的区别：`write` 不读原文，
   * `.bak` 无从谈起。T-112：读不到原文时**不许写** —— 整份覆盖会把旧内容抹平且没有第二份。
   */
  async function rawOverwrite(value: T): Promise<void> {
    // 读原文交给 `writeDisk`（`requireReadable` ⇒ 读不到就抛，T-112）；
    // 本文件**不再自己读**，所以 `readTextSync` 的消费者只剩 `disk-write` 一个。
    // `backup` 关掉时显式传 `null`（"没有原文"）⇒ 不写 `.bak`，也就没有"读不到原文"这一步可判。
    await writeDisk(resolvePath(), JSON.stringify(value), {
      previous: backup ? undefined : null,
      quarantineOnCorrupt: true,
      requireReadable: true,
    })
    emit(value)
  }

  /** 不排队的读：给锁内调用方用（`readInLock`）。写是原子 rename，读不会看到半截 */
  async function rawRead(): Promise<RepoRead<T>> {
    const { read } = await readRaw()
    return read
  }

  /** 不排队的读→改→写（含 CAS 比对 + 重试）：`update` 与 `updateInLock` 共用这一份 */
  async function rawUpdate(mutator: (value: T) => T | void): Promise<T> {
    const target = resolvePath()
    let attempts = 0

    for (;;) {
      const { read, text } = await readRaw()

      // D-42：读到的不是真实数据（损坏 / 读不到）时**禁止写**。以前这里会拿 fallback
      // 继续 update，一次点击就把用户文件覆盖成默认值——原文只剩 .bak 里那一份。
      if (!read.ok)
        throw new CepError('IO', msg.data.fn.fileReadReasonRefuseOverwrite(target, read.reason))
      if (opts.requireExisting && text === null) {
        throw new CepError('IO', msg.data.fn.fileNotExistsRefuseWrite(target))
      }

      const result = mutator(read.value)
      const next = (result === undefined ? read.value : result) as T

      // D-26：读 → 改 的窗口里，另一个面板（独立面板）可能已经写过。
      // 落盘前同步比对；不一致就丢掉本轮结果、在新值上重跑 mutator。
      const written = await persist(next, text, text)
      if (!written) {
        attempts += 1
        if (attempts > retries) {
          throw new CepError('IO', msg.data.fn.fileLockedByOtherPanel(target, String(retries)))
        }
        log.warn('repo', `${target} 被其他面板改过，重试 ${attempts}/${retries}`)
        // 退避 + 抖动：两个面板同时连点时，不加抖动会一直撞在同一个时间片里
        await new Promise((resolve) => setTimeout(resolve, 3 * attempts + Math.random() * 7))
        continue
      }

      emit(next)
      return next
    }
  }

  return {
    read: () => runQueued(() => rawRead()),

    write: (value) =>
      runQueued(async () => {
        await persist(value, null)
        emit(value)
      }),

    /**
     * 落盘但**不排队**：调用方必须已经持有 `runQueued` 的锁（锁内再排一次队会自锁）。
     * 用在"写 N 个库文件 + 写索引"这类独占事务里（`action-archive` / `style-library-io`）。
     */
    writeInLock: async (value) => {
      await persist(value, null)
      emit(value)
    },

    readInLock: () => rawRead(),

    overwrite: (value) => runQueued(() => rawOverwrite(value)),

    overwriteInLock: (value) => rawOverwrite(value),

    update: (mutator) => runQueued(() => rawUpdate(mutator)),

    updateInLock: (mutator) => rawUpdate(mutator),

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
