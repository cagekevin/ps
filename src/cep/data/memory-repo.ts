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

    update: (mutator) =>
      enqueue(() => {
        const result = mutator(value)
        if (result !== undefined) value = result
        for (const listener of listeners) listener(value)
        return Promise.resolve(value)
      }),

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
