import { hasNode, readTextFile, readTextSmart, writeTextFile, writeTextFileAtomic } from '@/cep/fs'
import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'
import type { Repo, RepoRead } from './types'

export interface FileRepoOptions<T = unknown> {
  /** 写之前把原文备份成 .bak，默认开（ADR-12） */
  backup?: boolean
  /** 文件不存在时 update 直接报错，禁止用 fallback 覆盖写 */
  requireExisting?: boolean
  /** 写前发现文件被别的面板改过时的重试次数，默认 5（D-26） */
  retries?: number
  /**
   * 读边界归一：把 `JSON.parse` 出来的 `unknown` 变成 `T`。
   *
   * **形状不认识必须返回 `null`**——`readRaw` 会把它转成 `degraded` + fallback，用户能在界面上看到。
   * 归一器里不许补默认值：那等于把坏文件变成"看起来能用"（硬规则 20(b) 的静默回退）。
   *
   * 不传 = 仍把解析结果直接当 `T`（未接归一的仓库，剩余清单见台账 T-99-2）。
   */
  normalize?: (raw: unknown) => T | null
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
  opts: FileRepoOptions<T> = {},
): Repo<T> {
  const backup = opts.backup !== false
  const retries = opts.retries ?? 5
  const normalize = opts.normalize
  const listeners = new Set<(value: T) => void>()
  let queue: Promise<unknown> = Promise.resolve()

  function enqueue<R>(task: () => Promise<R>): Promise<R> {
    // 前一条失败不阻塞后一条（和 transport 的队列同一语义）
    const next = queue.then(task, task)
    queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  function emit(value: T) {
    for (const listener of listeners) listener(value)
  }

  async function readRaw(): Promise<RepoRead<T> & { text: string | null }> {
    const target = resolvePath()
    let text: string | null

    try {
      text = await readTextSmart(target)
    } catch (e) {
      // 读不抛：文件可能在原面板那边被占用，回退默认值但要标记
      log.warn('repo', `${target} 读取失败，使用默认值`, e)
      return { value: fallback(), text: null, degraded: '读取失败' }
    }

    // 文件不存在是首次使用的正常状态，不算 degraded
    if (!text) return { value: fallback(), text: null }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      // 坏文件是错误不是警告：与 `style-library-repo.ts:136` 同一档（用户能在「打开日志」里查到）
      log.error('repo', `${target} 不是合法 JSON，使用默认值`, e)
      return { value: fallback(), text, degraded: '内容不是合法 JSON' }
    }

    // 没接归一的仓库：解析结果直接当 T。这是"形状"的第二份真相，逐仓库接归一后消失（T-99-2）
    if (!normalize) return { value: parsed as T, text }

    const value = normalize(parsed)
    if (value === null) {
      // 结构不认识 ≠ 文件不存在：两者必须能分辨，否则坏文件在页面上就是"空面板"
      log.error('repo', `${target} 内容结构不认识，使用默认值`)
      return { value: fallback(), text, degraded: '内容结构不认识' }
    }
    return { value, text }
  }

  /**
   * 落盘前的 CAS 比对（D-26）。返回 `'same' | 'diff' | 'unknown'`。
   *
   * 必须用**同步**读：`readTextSmart` 是 async，即使 Node 读本身是同步的，`await` 也会让出
   * 一个 microtask 边界——另一个实例（跨进程的等价前提）正好能在这个边界里完成一次完整写入，
   * 于是"比对通过 → rename"之间被插一脚，照样丢更新。实测过：换成同步读之前，
   * 两个实例各写 20 次只活下来 20 条（`tests/data/repo-cross-process.test.ts`）。
   *
   * 比对放在 `persist` 里、`.bak` 之后、原子写之前，所以"比对 → rename"之间只剩
   * 「写 tmp + rename」两个同步系统调用。这一段**不是零**：两个进程仍可能都通过比对、
   * 后写的赢（窗口 µs 级）。要彻底消除得靠跨进程锁，见台账 D-26 的取舍。
   *
   * `unknown` = 无 Node（读不到原文），无从比对；那种情况下写本身会走 NO_NODE 抛错路径。
   */
  function compareSync(target: string, expected: string | null): 'same' | 'diff' | 'unknown' {
    if (!hasNode()) return 'unknown'
    // 原来的 `catch { return 'diff' }` 不可达：`readTextFile`（fs.ts:55-64）自带 try/catch、
    // 失败只 return null，从不抛；`===` 比两个原始值也不会抛。
    return readTextFile(target) === expected ? 'same' : 'diff'
  }

  /**
   * 落盘。写失败必须抛：这里不做任何兜底（ADR-14）。
   *
   * 返回 `false` = 传了 `expected` 且磁盘原文已经不是它（别的面板改过）。比对故意放在
   * `.bak` 之后、原子写之前：中间只剩「写 tmp + rename」，能压多短压多短。
   */
  async function persist(
    value: T,
    previous: string | null,
    expected?: string | null,
  ): Promise<boolean> {
    const target = resolvePath()
    const text = JSON.stringify(value)

    if (backup && previous) writeTextFile(`${target}.bak`, previous)
    if (expected !== undefined && compareSync(target, expected) === 'diff') return false

    // 原子写；Node 不可用时返回 false，退回普通写（普通写会抛 NO_NODE）
    if (!writeTextFileAtomic(target, text)) writeTextFile(target, text)
    return true
  }

  return {
    read: () =>
      enqueue(async () => {
        const { value, degraded } = await readRaw()
        return { value, degraded }
      }),

    write: (value) =>
      enqueue(async () => {
        await persist(value, null)
        emit(value)
      }),

    update: (mutator) =>
      enqueue(async () => {
        const target = resolvePath()
        let attempts = 0

        for (;;) {
          const { value, text, degraded } = await readRaw()

          // D-42：读到的不是真实数据（损坏 / 读不到）时**禁止写**。以前这里会拿 fallback
          // 继续 update，一次点击就把用户文件覆盖成默认值——原文只剩 .bak 里那一份。
          if (degraded) throw new CepError('IO', `${target} ${degraded}，拒绝覆盖写`)
          if (opts.requireExisting && text === null) {
            throw new CepError('IO', `${target} 不存在，拒绝写入`)
          }

          const result = mutator(value)
          const next = (result === undefined ? value : result) as T

          // D-26：读 → 改 的窗口里，另一个面板（独立面板）可能已经写过。
          // 落盘前同步比对；不一致就丢掉本轮结果、在新值上重跑 mutator。
          const written = await persist(next, text, text)
          if (!written) {
            attempts += 1
            if (attempts > retries) {
              throw new CepError(
                'IO',
                `${target} 正被其他面板修改，写入已放弃（重试 ${retries} 次）`,
              )
            }
            log.warn('repo', `${target} 被其他面板改过，重试 ${attempts}/${retries}`)
            // 退避 + 抖动：两个面板同时连点时，不加抖动会一直撞在同一个时间片里
            await new Promise((resolve) => setTimeout(resolve, 3 * attempts + Math.random() * 7))
            continue
          }

          emit(next)
          return next
        }
      }),

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
