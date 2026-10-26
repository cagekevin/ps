// 是什么：单文件 JSON 仓库的实现（串行队列 + 原子写 + .bak + CAS 比对 + 必填 decode 通道）
// 唯一入口：**不是这里** —— 应用层唯一构造器是 `./data-repo` 的 `dataRepo`（它管环境选择与内存分支）。
//   本文件仍导出 `fileRepo`，只给实现级用例；直接调用绕过的是「环境选择」而**不是**「形状通道」，
//   在无 Node 的浏览器里会抛 `NO_NODE`（**响的**），不会静默写坏数据。
//   ⇒ 这条我判「放弃强声明」：`fileRepo` 是**唯一实现**，不是唯一入口（TS 没有 package-private）。
// **怎么用**：应用层（store / command / 页面）**不要直接调用**，一律 `import { dataRepo } from './data-repo'`。
// **别这么写**：在 store / command / 页面里 `fileRepo(...)` —— 你跳过了环境选择，浏览器 dev 直接炸。
// 替代了什么：`pick.ts` 的可选 `normalize` 参数
// 谁在用（**两具名例外 + 实现级用例**）：
//   ① `data-repo.ts` —— 唯一构造器，环境选择在它那里；
//   ② `swatch-repo.ts` —— **具名例外**：色板是**用户资产**，`dataRepo` 的内存兜底会把"读不到"
//      变成"空色板 + 写入落内存"（静默丢）。这里宁可在无 Node 时抛 `NO_NODE`（响的）；
//   ③ 实现级用例三处：`tests/cep/file-repo-realfs.test.ts`（动态 import）、`tests/data/repo.test.ts`（import）、
//      `tests/scripts/data-repo-realfs.test.ts`（夹具字符串，不真 import）。
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { foldAbsent, readRepoFile } from './repo-read'
import { writeDiskSync, type CasMode } from '@/cep/disk-write'
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
   * `cas` 由调用方表态：`rawUpdate` 传「与读到的原文比」，`write` 传「不比 + 理由」。
   * 具体顺序（备份 → CAS → 原子写）在 `./disk-write` 的 `writeDiskSync` 里，本文件不再重写一遍。
   */
  function persist(value: T, previous: string | null, cas: CasMode): void {
    // **同步**落盘：原语本来就是 `renameSync`；异步只多一个 microtask 边界，
    // 而那正是 D-26 丢更新的窗口。
    // 失败一律抛（含 CAS 冲突 ⇒ `CONFLICT`），本函数没有返回值可丢。
    writeDiskSync(resolvePath(), JSON.stringify(value), {
      backup: backup
        ? { mode: 'keep', previous }
        : { mode: 'none', why: '仓库构造时 opts.backup=false' },
      cas,
    })
  }

  /**
   * 整份替换：备份恒定开（`backup: false` 的仓库除外）+ 读不到原文就抛（T-112），CAS 由调用方表态。
   *
   * 与 `rawUpdate` 的区别：`rawUpdate` 是读→改→写并自己重试；这里调用方已经算好完整内容。
   * 本文件**不自己读原文**（交给 `requireReadable`），所以 `readTextSync` 的消费者只有 `disk-write`。
   */
  function replace(value: T, cas: CasMode): void {
    // `backup` 关掉时不读原文 ⇒ `requireReadable` 这一步也不存在（没有原文可判）
    writeDiskSync(resolvePath(), JSON.stringify(value), {
      backup: backup ? { mode: 'keep' } : { mode: 'none', why: '仓库构造时 opts.backup=false' },
      cas,
      quarantineOnCorrupt: true,
      requireReadable: true,
    })
    emit(value)
  }

  /** 读一次：写是原子 rename，读到的要么旧值要么新值，不会看到半截 */
  function rawRead(): RepoRead<T> {
    const { read } = readRaw()
    return read
  }

  /**
   * 读→改→写（含 CAS 比对 + 重试）。
   *
   * **同步**：整段不可被打断。写原语是 `renameSync`，本来就同步；
   * 以前为了等一个 async 读把这段拆成两半，中间那个 microtask 边界正是 D-26 丢更新的位置。
   */
  function rawUpdate(mutator: (value: T) => T | void): T {
    const target = resolvePath()
    let attempts = 0

    for (;;) {
      const { read, text } = readRaw()

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
      // 落盘前同步比对；不一致时 `writeDiskSync` 抛 `CONFLICT` 且**不写**，我们在新值上重跑 mutator。
      try {
        persist(next, text, { mode: 'compare', expected: text })
      } catch (e) {
        // **只接「CAS 冲突」这一种** —— 它不是失败，是"该重跑"。
        // 其余（IO 错 / 无 Node）一律往上抛：那是真失败，不许在这里变成"再试一次"。
        if (!(e instanceof CepError && e.code === 'CONFLICT')) throw e
        attempts += 1
        if (attempts > retries) {
          throw new CepError('IO', msg.data.fn.fileLockedByOtherPanel(target, String(retries)))
        }
        log.warn('repo', `${target} 被其他面板改过，重试 ${attempts}/${retries}`)
        // 不退避等待：整段同步，本进程内不可能有第二个写插进来；
        // 跨进程窗口只剩「读 → 比对」几条指令，立刻重试就是最优解。
        continue
      }

      emit(next)
      return next
    }
  }

  // 全是同步段：没有队列、没有 `*InLock`。
  // 一次「读 → 改 → 写」在 JS 单线程里不可被打断，不需要排队。
  return {
    read: () => rawRead(),

    replace,

    update: (mutator) => rawUpdate(mutator),

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
