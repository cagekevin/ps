// 是什么：`RepoRead` 的**渲染**折叠——坏读时给 fallback 继续渲染，坏因统一落日志
// 唯一入口：坏值**只流向渲染**的读取只能经过这里（准入判据见清单 §6.7）
// 替代了什么：各处自己写 `read.value ?? []` / 直接取 `.value`（坏文件静默变空，无任何信号）
// 谁在用：`cep/data/font-meta.ts`（标签 / 星级）、`stores/font-set.ts`（4 份展示数据）
// 禁止：命令层与写路径一律不用；坏值会进 jsx 实参 / 写盘 / "是否放行"判断的一律不用——那些必须抛

import { log } from '@/utils/logger'
import type { RepoRead } from './types'

/**
 * 渲染折叠：坏掉 = 这份数据不存在，用 fallback 继续渲染，坏因落 `log.warn`
 * （`设置页 → 打开日志` 能查到）。**不是静默回退**，但日志只算最低档信号。
 *
 * **准入判据**（清单 §6.7，判"坏值的出口"，不判"这处重不重要"）：
 * - 坏值进 写盘 / jsx 实参 / "是否放行"判断 → **S1，不许用这里**，必须抛；
 * - 坏值只进渲染，且 fallback **非空**（渲染成默认值，与"用户自己配的"不可分辨）→ S2：
 *   可以用这里，但**同时欠一条页面级 `degraded`**；页面没槽时在调用点留 `TODO`，别当达标；
 * - 坏值只进渲染，且 fallback 是 `[]`（"空"本身就是该数据的合法状态：没有标签 / 没有收藏 /
 *   没有最近记录）→ S3：日志够了。
 *
 * 一个函数折叠 6 处，而不是 6 处各写一个 `if (!ok) return []`——后者是把兜底换个写法搬地方，
 * 且每处都会漏掉信号。
 */
export function readOr<T>(read: RepoRead<T>, fallback: T, scope: string): T {
  if (read.ok) return read.value
  log.warn(scope, `读取失败，按空/默认值展示：${read.reason}`)
  return fallback
}
