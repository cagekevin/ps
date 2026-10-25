// 是什么｜替代了什么｜谁在用
// 是什么：**目录占用的唯一统计处** —— 递归求和，并如实报出"少算了几个"（`skipped`）
// 替代了什么：`cep/fs.ts:263-311`（原来挂在"文件系统"文件里，与读原语共享 `nodeRequire`，但判据完全不同）
// 谁在用：`cep/readonly.ts`（`pages/set/components/ClearCacheDialog.vue` 显示缓存占用）
// 别这么写：`return 0` 兜"读不到" —— 那会把读失败说成"空缓存"（本文件返回 `null`，调用方显示「无法读取」）

import { hasNode, nodeRequire } from './node'

/**
 * 目录占用（递归求和）；`bytes` 只算普通文件，不跟符号链接。
 *
 * `skipped` = 统计时读不到（`EPERM` / 被占用）而**少算**的文件数。它不是装饰：
 * 有值时 `bytes` 只是下限，UI 必须让用户看出"这个数字不准"（之前是空 catch，少算了多少没人知道）。
 */
export interface DirUsage {
  bytes: number
  files: number
  skipped: number
}

/**
 * 递归统计一个目录的占用。**只读**，不删不改（清缓存命令没有证据，见 T-68）。
 *
 * 为什么不用 shell / jsx：CEP 里没有稳定的 `du`；Node 的 `readdirSync({withFileTypes})`
 * 在 CEP 12 的 Node 上够用。Node 不可用或目录不存在返回 `null`——调用方要显示「无法读取」，
 * 不许把 0 当成「空缓存」（那会把读失败说成"没缓存"）。
 */
export function dirUsage(absPath: string): DirUsage | null {
  if (!hasNode()) return null
  try {
    const fs = nodeRequire('fs')
    const path = nodeRequire('path')
    // 不用 `existsSync` 先判存在：`readdirSync` 自己对不存在抛 `ENOENT`，结果同样是 `null`，
    // 而 `existsSync` 会把"存在但 stat 不到"也说成不存在（T-108 实测）。这里两态是对的：
    // 调用方对"没有这个目录"与"读不到"做**同一件事**（显示「无法读取」），且没有写路径
    let bytes = 0
    let files = 0
    let skipped = 0
    const walk = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (!entry.isFile()) continue
        try {
          // 单个文件读不到大小就跳过：宁少算，不整次失败
          bytes += fs.statSync(full).size
          files += 1
        } catch {
          // 权限/占用中的文件：算不进 bytes，但必须**数出来**（少算了几个要能说）
          skipped += 1
        }
      }
    }
    walk(absPath)
    return { bytes, files, skipped }
  } catch {
    return null
  }
}
