// 是什么：**按路径取 Repo 的唯一入口** —— 一个逻辑文件 = 一个 Repo 实例（按路径缓存）
// 替代了什么：`swatch-repo.ts` 里那份私有 `swatchRepos` Map（同样的东西，只是没共享出来）
// 谁在用：多文件域（色板、样式库四类 `.ku`）；单文件域直接用 `dataRepo`
// 为什么需要：`Repo` 一个实例 = 一个固定路径（`resolvePath` 闭包）。多文件域的路径随当前仓库变，
//   于是每个域都得自己写一份 `Map<path, Repo>` + 自己手写「读原文 → `.bak` → 原子写」。
//   手写那份**没有 `onChange`** ⇒ store 收不到"数据变了" ⇒ 页面只能每次命令后手工 `load()`。
// 禁止：本模块以外再写一份 `Map<path, Repo>`（那就是第二份真相）

import { fileRepo } from './file-repo'
import type { Repo } from './types'
import type { Decoder } from '@/utils/decode'

const cache = new Map<string, Repo<unknown>>()

/**
 * 取 `path` 对应的 Repo（同一路径永远同一个实例）。
 *
 * 为什么必须缓存：Repo 的写队列与监听表是**实例级**的。每次新建实例 = 队列分裂、
 * `onChange` 订阅各自为政 ⇒ 同一文件被两个实例写 = 丢更新（D-12 的老坑）。
 *
 * **用 `fileRepo` 而不是 `dataRepo`**：这些文件是用户资产，`dataRepo` 的内存兜底会把
 * "读不到"变成"空内容 + 写入落内存"（静默丢）。宁可在无 Node 时抛 `NO_NODE`（响的）。
 */
export function repoAt<T>(path: string, fallback: () => T, decode: Decoder<T>): Repo<T> {
  const hit = cache.get(path)
  if (hit) return hit as Repo<T>

  const created = fileRepo<T>(() => path, fallback, decode)
  cache.set(path, created as Repo<unknown>)
  return created
}
