// 是什么｜替代了什么｜谁在用
// 是什么：**长事务的互斥守卫**，按「文件族」分域。**不是锁，也不做原子性**
// 替代了什么：`write-queue.ts` 那条全局 Promise 链里"顺手"承担的互斥职责
// 谁在用：`style-library-io.importKuArchive` / `style-library-repo.deleteWarehouse`（库文件族）
//         `action-archive.importActionArchive` / `actions.deleteWarehouse`（动作库族）
// 禁止：拿它做「读→改→写」的原子性 —— 那个由 `Repo<T>` 的同步段保证，不需要互斥
//
// ── 它解决的是哪一类问题（和同步段的分工）──────────────────────────────────────
// `Repo<T>` 全同步之后，「一次读 → 改 → 写」不可能被打断 —— 这是**结构保证**。
// 但**跨多次调用的长事务**不行：
//     导入 = 读用户选的文件（真 await，jsx 回退）→ 写 N 个库文件 → 写索引
// 中间那个真 await 让出 macrotask，第二次触发就能插进来，两个事务交替写同一批文件，
// 最后写索引的那个用自己的 list 覆盖 ⇒ 索引和实际文件对不上。
//
// 这不是原子性问题（每一段都原子），是**同一批文件同时被两个事务改**。
//
// ── 为什么不恢复全局队列 ──────────────────────────────────────────────────────
// 全局队列会让一次导入挡住一次**无关**的色板写入（它俩的文件族不重叠）。
// 互斥域按文件族分，只挡真正会打架的。
//
// ── 诚实说明：这不是"结构上不可能" ───────────────────────────────────────────
// 它是**运行时检查**：用户就是能点两次，代码没法让"点两次"这件事编译不过。
// 真正结构上不可能的是「同一文件被两个同步段同时写」—— 那个已经由同步段解决了。
// 这一层只是把"能点两次"变成"第二次立刻得到明确拒绝"，而不是静默写坏。
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'

/**
 * 互斥域 = **文件族**，不是函数。
 *
 * 按函数分域会漏：`importKuArchive` 与 `deleteWarehouse` 是两段代码，写的却是同一批
 * `sj_ku*` 文件 —— 它们必须互斥。按文件族分，新增同类操作时只要选对域就自动正确。
 */
export type ExclusiveDomain = 'ku-files' | 'action-files'

const held = new Set<ExclusiveDomain>()

function enter(domain: ExclusiveDomain, what: string): void {
  if (held.has(domain)) throw new CepError('IO', msg.data.fn.exclusiveBusy(what))
  held.add(domain)
}

/** 同步长事务（如 `deleteWarehouse`：搬文件 + 改索引 + 删原件） */
export function runExclusive<T>(domain: ExclusiveDomain, what: string, task: () => T): T {
  enter(domain, what)
  try {
    return task()
  } finally {
    held.delete(domain)
  }
}

/** 异步长事务（如导入：读用户文件是真 await，之后才是同步写段） */
export async function runExclusiveAsync<T>(
  domain: ExclusiveDomain,
  what: string,
  task: () => Promise<T>,
): Promise<T> {
  enter(domain, what)
  try {
    return await task()
  } finally {
    held.delete(domain)
  }
}
