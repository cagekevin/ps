import { readTextSmart, writeTextFile, writeTextFileAtomic } from '@/cep/fs'
import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'
import type { Repo, RepoRead } from './types'

export interface FileRepoOptions {
  /** 写之前把原文备份成 .bak，默认开（ADR-12） */
  backup?: boolean
  /** 文件不存在时 update 直接报错，禁止用 fallback 覆盖写 */
  requireExisting?: boolean
}

/**
 * 单文件 JSON 仓库。
 *
 * 队列是**每个实例一条**：同一文件的所有 update 串行，避免
 * "两次 read 都拿旧值 → 后写覆盖先写"（D-12）。
 */
export function fileRepo<T>(
  resolvePath: () => string,
  fallback: () => T,
  opts: FileRepoOptions = {},
): Repo<T> {
  const backup = opts.backup !== false
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

    try {
      return { value: JSON.parse(text) as T, text }
    } catch (e) {
      log.warn('repo', `${target} 不是合法 JSON，使用默认值`, e)
      return { value: fallback(), text, degraded: '内容不是合法 JSON' }
    }
  }

  /** 写失败必须抛：这里不做任何兜底（ADR-14） */
  async function persist(value: T, previous: string | null) {
    const target = resolvePath()
    const text = JSON.stringify(value)

    if (backup && previous) writeTextFile(`${target}.bak`, previous)

    // 原子写；Node 不可用时返回 false，退回普通写（普通写会抛 NO_NODE）
    if (!writeTextFileAtomic(target, text)) writeTextFile(target, text)
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
        const { value, text } = await readRaw()
        if (opts.requireExisting && text === null) {
          throw new CepError('IO', `${resolvePath()} 不存在，拒绝写入`)
        }
        const result = mutator(value)
        const next = (result === undefined ? value : result) as T
        await persist(next, text)
        emit(next)
        return next
      }),

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
