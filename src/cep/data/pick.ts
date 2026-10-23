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
 * 单独成文件是为了避免 `data/index.ts` 与各仓库文件互相 import 成环。
 */
export function pick<T>(
  resolvePath: () => string,
  fallback: () => T,
  seed: () => T = fallback,
  options: FileRepoOptions<T> = {},
): Repo<T> {
  return hasCep() ? fileRepo(resolvePath, fallback, options) : memoryRepo(seed)
}
