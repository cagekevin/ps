/**
 * 动作库的**类型**与归一化（无 IO）。
 *
 * 类型放 domain：页面只允许依赖领域类型，不允许直接碰 `cep/data`（ADR-16 护栏）。
 *
 * 结构全部来自原版源码：
 * - 索引 `sj_dzStoreInfo.json`：`{ index, list: [{ name, fileName }] }`（`app.v4.js:6552-6559`）
 * - 仓库文件：`[{ groupName, show, list: [{ group, name, alias? }] }]`
 */
import { isRecord } from '@/utils/guards'
import { decodeIndexed, shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'

export interface ActionItem {
  /** PS 动作组名 */
  group: string
  name: string
  /** 别名：显示用，执行仍用 group + name */
  alias?: string
}

export interface ActionGroup {
  groupName: string
  show: boolean
  list: ActionItem[]
}

export type ActionLibrary = ActionGroup[]

export interface ActionWarehouse {
  name: string
  fileName: string
}

export interface ActionWarehouseIndex {
  index: number
  list: ActionWarehouse[]
}

/**
 * 归一化 `dz_getActionList` 的返回。
 *
 * **返回结构未在真机验证**（用户不参与、禁止 e2e），所以两种常见包装都兜：
 * - `ActionGroup[]`
 * - `{ info: ActionGroup[] }`
 *
 * 校验规则照抄原版 `checkError`（`app.v4.js:55873-55890`）：
 * 组必须有 `groupName/show/list`，项必须有 `group/name`，不合法的丢掉而不是崩。
 */
export interface ActionListRead {
  groups: ActionGroup[]
  /** 原始分组数 */
  received: number
  /** 解析出的动作总数；0 且 received>0 才算结构不认识 */
  actions: number
  /**
   * 返回的外层形状：
   * - `array` / `info`：认识
   * - `unknown`：有返回值但不是预期结构 → 不能谎报"没有动作"
   */
  shape: 'array' | 'info' | 'unknown'
}

/** 详细解析结果；页面用 `shape` 区分"真的没有"和"结构不认识" */
export function readActionList(raw: unknown): ActionListRead {
  const info = (raw as { info?: unknown } | null)?.info
  const isArray = Array.isArray(raw)
  const list = isArray ? (raw as unknown[]) : Array.isArray(info) ? info : []

  const shape: ActionListRead['shape'] = isArray
    ? 'array'
    : Array.isArray(info)
      ? 'info'
      : raw == null
        ? 'array'
        : 'unknown'

  const groups = normalizeGroups(list)
  return {
    groups,
    received: list.length,
    actions: groups.reduce((sum, group) => sum + group.list.length, 0),
    shape,
  }
}

/** 条目形状有出处：`app.v4.js:6552-6559` = `{ index, list: [{ name, fileName }] }` */
function isActionWarehouse(x: unknown): x is ActionWarehouse {
  return isRecord(x) && typeof x.name === 'string' && typeof x.fileName === 'string'
}

/** 读边界：动作仓库索引（容器坏 / 有条目不是对象 → 整份失败 + 原因，不丢条目） */
export function decodeActionWarehouseIndex(
  raw: unknown,
): Decoded<ActionWarehouseIndex> | DecodeFail {
  return decodeIndexed(raw, isActionWarehouse)
}

/**
 * 读边界：动作库。形状判据在 `readActionList`（它认裸数组与 `{ info: [...] }` 两种包装）。
 *
 * ⚠️ `null` 必须在这里拒掉：`readActionList` 把 `null` 归成 `'array'`（那是**消费侧**
 * "PS 没返回就当中没有"的口径）。读边界上，文件内容是 `null` 就是坏文件 ——
 * 放过去等于"坏文件当空库"，`update` 会把 `[]` 写回磁盘（丢数据）。
 */
export function decodeActionLibrary(raw: unknown): Decoded<ActionLibrary> | DecodeFail {
  if (raw === null || raw === undefined) return { fail: 'emptyContent' }
  const read = readActionList(raw)
  // 说清是哪一种坏：外层形状不认识（形状臂）vs 有分组但一个动作都解析不出来（语义臂）
  if (read.shape === 'unknown') return shapeFail('', 'array', raw)
  if (read.received > 0 && read.actions === 0) {
    return { fail: 'noItemsParsed', count: read.received }
  }
  return { value: read.groups }
}

function normalizeGroups(list: unknown[]): ActionGroup[] {
  const groups: ActionGroup[] = []

  for (const entry of list) {
    // 形状证明用守卫，不用 `as Record<string, unknown>`（guards.ts:6 明禁）
    if (!isRecord(entry)) continue

    const groupName = entry.groupName ?? entry.name
    if (typeof groupName !== 'string') continue

    // 原版 dz_getActionList：{ name, children:[{ name }] }
    // 本地库：{ groupName, list:[{ group, name }] }
    const children = Array.isArray(entry.children) ? entry.children : []
    const localItems = Array.isArray(entry.list) ? entry.list : []
    const items: ActionItem[] = []

    if (children.length > 0) {
      for (const item of children) {
        if (!isRecord(item) || typeof item.name !== 'string') continue
        items.push({ group: groupName, name: item.name })
      }
    } else {
      for (const item of localItems) {
        if (!isRecord(item) || typeof item.group !== 'string' || typeof item.name !== 'string') {
          continue
        }
        items.push({ group: item.group, name: item.name })
      }
    }

    groups.push({
      groupName,
      show: entry.show !== false,
      list: items,
    })
  }

  return groups
}
