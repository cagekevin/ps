// 是什么：`RepoRead` 的纯展示折叠——坏掉等价于"这份数据不存在"，用 fallback 继续渲染
// 唯一入口：清单 `docs/生成/RepoRead消费方清单.md` §二 点名的纯展示处，取 fallback 只能经过这里
// 替代了什么：各处自己写 `read.value ?? []` / 直接取 `.value`（坏文件静默变空，无任何信号）
// 谁在用：`cep/data/font-meta.ts`、`commands/fontSet.ts`（翻译计数）、`stores/font-set.ts`（4 份展示数据）
// 禁止：命令层与写路径用它——那里坏了必须抛；新增调用点先确认属于"坏了等于空"并登记清单 §二

import { log } from '@/utils/logger'
import type { RepoRead } from './types'

/**
 * 纯展示读取：坏掉 = 这份数据不存在，用 fallback 继续渲染。
 *
 * **不是静默回退**：`reason` 在这里统一落 `log.warn`（`设置页 → 打开日志` 能查到）。
 * 一个函数折叠 9 处，而不是 9 处各写一个 `if (!ok) return []`——后者是把兜底换个写法搬地方，
 * 且每处都会漏掉信号。判据见清单 §二。
 */
export function readOr<T>(read: RepoRead<T>, fallback: T, scope: string): T {
  if (read.ok) return read.value
  log.warn(scope, `读取失败，按空/默认值展示：${read.reason}`)
  return fallback
}
