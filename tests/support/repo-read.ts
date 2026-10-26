// 是什么：测试里取 `RepoRead` 值的唯一入口（旧形状 `{ value, degraded }` 的 `.value` 已被联合替掉）
// 替代了什么：`const { value } = await repo.read()` / `(await repo.read()).value` 的散写
// 谁在用：断言"这次必须读到真数据"的用例
// 禁止：给 src 用——src 里取不到就是取不到，不许替生产者捏造（ADR-24）

import type { RepoRead } from '@/cep/data/types'

/**
 * 取读到的值。**读坏了当场红**：用例本来就是在断言"这次必须读到真数据"，
 * 所以抛错等价于断言失败，不是兜底。坏因的断言直接写 `read.reason`（两种分支都有）。
 */
export function readValue<T>(read: RepoRead<T>): T {
  if (read.status !== 'ok') throw new Error(`用例期望读到真数据，实际是坏读：${read.reason}`)
  return read.value
}
