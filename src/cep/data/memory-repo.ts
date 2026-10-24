import type { Repo } from './types'

/**
 * 内存仓库。**只在浏览器 dev 里用**。
 *
 * 为什么需要它：P3 把 `ps.ts` 里的 mock 分支拿掉后，浏览器里没有 Node，
 * 写文件会抛 `NO_NODE`；标签/星级就没人兜底了。data 层必须和 jsx 一样双实现。
 *
 * 注意：CEP 里 Node 不可用时**不许**退回这里（ADR-14）——那会让用户以为保存成功。
 */
export function memoryRepo<T>(initial: () => T): Repo<T> {
  let value = initial()
  const listeners = new Set<(value: T) => void>()
  let queue: Promise<unknown> = Promise.resolve()

  function enqueue<R>(task: () => Promise<R>): Promise<R> {
    const next = queue.then(task, task)
    queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  return {
    // 内存态没有"从磁盘读到坏内容"这一步，所以永远是成功读（`ok: true`）
    read: async () => ({ ok: true as const, value }),

    write: (next) =>
      enqueue(() => {
        value = next
        for (const listener of listeners) listener(value)
        return Promise.resolve()
      }),

    /**
     * 内存仓库没有磁盘事务，`writeInLock` 与 `write` 同语义（TD-09-18）。
     * 它**不并进** `data/write-queue` 的链：内存实现没有磁盘、也没有跨仓库共享的文件，
     * 并链只会让浏览器 dev 与用例里互不相干的仓库互相阻塞（实测：并链后 39 条用例失败）。
     */
    writeInLock: (next) =>
      enqueue(() => {
        value = next
        for (const listener of listeners) listener(value)
        return Promise.resolve()
      }),

    update: (mutator) =>
      enqueue(() => {
        const result = mutator(value)
        if (result !== undefined) value = result
        for (const listener of listeners) listener(value)
        return Promise.resolve(value)
      }),

    /**
     * 锁内的读：调用方已持有全局 `runQueued` 锁，内存态读永远成功、无需再排本地队列。
     * 与 `writeInLock` 同一约定（不并进本地 `enqueue`）。
     */
    readInLock: async () => ({ ok: true as const, value }),

    /** 锁内的读→改→写：全局链已串行化，直接同步改内存值，不再排本地队列 */
    updateInLock: async (mutator) => {
      const result = mutator(value)
      if (result !== undefined) value = result
      for (const listener of listeners) listener(value)
      return value
    },

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
