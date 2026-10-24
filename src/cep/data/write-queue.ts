// 是什么：数据层**唯一**的串行写队列（所有"读 → 改 → 写"都排在这一条链上）
// 唯一入口：`runQueued(task)`；任务体内部**只做读改写**，不要再 `await runQueued(...)`
// 替代了什么：swatch-repo 的 `enqueue`、file-repo 的实例级 `queue`、action-archive 的 `enqueue`
//   ——三份一模一样的实现，其中 action-archive 那份与另外两份互不串行（TD-09-18）
// 谁在用：swatch-repo / style-library-repo / file-repo / action-archive / protected-text
// 禁止：在任务体里再排一个任务（会自锁）；调用方不许自己再造一条链
//   锁内一律用 `Repo` 的 `readInLock` / `writeInLock` / `updateInLock`。
//   这条禁令**不是靠人记**：`tests/scripts/write-queue-nesting.test.ts` 扫 `src/cep/data/**`
//   的任务体，触达任何排队入口（含跨文件传递调用）即红（TD-09-35）

/**
 * 一条链，一个语义：**上一条失败不阻塞下一条**（和 transport 的队列同一约定）。
 *
 * 为什么是"全局一条"而不是"每个文件一条"：
 * `action-archive` 的一次导入要写 N 个库文件 + 1 个索引，`sendKuItemToSwatch` 的一次操作
 * 要读库文件再写色板文件——这些都跨文件。按文件分锁时，跨文件事务拿不到"整段独占"，
 * 中间照样能被插进另一次写。数据层写的是几 KB 的 JSON，串行化的代价可以忽略，
 * 而"后写覆盖先写"是用户可见的数据丢失，所以选全局一条。
 */
let chain: Promise<unknown> = Promise.resolve()

export function runQueued<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task)
  chain = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}
