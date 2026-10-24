import { hasCep } from '@/cep/transport'
import { fileRepo, type FileRepoOptions } from './file-repo'
import { memoryRepo } from './memory-repo'
import type { Repo } from './types'

/**
 * 按环境选实现，**只看 hasCep**：
 * - 浏览器（无 CEP）→ 内存 + dev 种子
 * - CEP（有/无 Node）→ 文件；无 Node 时写会抛 NO_NODE，不许退回内存（ADR-14）
 *
 * `options.normalize` 只在文件实现里生效：内存仓库的初值本来就是 `T`（`seed`），
 * 没有"从磁盘读到的 unknown"这一步，不需要也不该再归一一次。
 *
 * **实现在第一次使用时才定，不在模块加载时定死**（T-113）：13 个仓库都在 import 期调 `pick()`，
 * 若这里直接 `return hasCep() ? fileRepo : memoryRepo`，测试把 CEP 桥装晚一步就会静默走
 * `memoryRepo`（永不失败）——用例全绿但测的是内存仓库（T-111 第一版踩过）。
 * `npm run check` 的 `assertion-guard` 会拦住回到老写法（`return hasCep() ?`）。
 *
 * 单独成文件是为了避免 `data/index.ts` 与各仓库文件互相 import 成环。
 */
export function pick<T>(
  resolvePath: () => string,
  fallback: () => T,
  seed: () => T = fallback,
  options: FileRepoOptions<T> = {},
): Repo<T> {
  /** 只在**首次调用**时求值并缓存：同一仓库实例的队列 / 监听表不能因为多次选择而分裂 */
  let impl: Repo<T> | null = null
  const repo = (): Repo<T> =>
    (impl ??= hasCep() ? fileRepo(resolvePath, fallback, options) : memoryRepo(seed))

  return {
    read: () => repo().read(),
    write: (value) => repo().write(value),
    update: (mutator) => repo().update(mutator),
    onChange: (listener) => repo().onChange(listener),
  }
}
