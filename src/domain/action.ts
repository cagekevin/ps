/**
 * 动作库的**类型**与归一化（无 IO）。
 *
 * 类型放 domain：页面只允许依赖领域类型，不允许直接碰 `cep/data`（ADR-16 护栏）。
 *
 * 结构全部来自原版源码：
 * - 索引 `sj_dzStoreInfo.json`：`{ index, list: [{ name, fileName }] }`（`app.v4.js:6552-6559`）
 * - 仓库文件：`[{ groupName, show, list: [{ group, name, alias? }] }]`
 */
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

export function normalizeActionList(raw: unknown): ActionGroup[] {
  return readActionList(raw).groups
}

function normalizeGroups(list: unknown[]): ActionGroup[] {
  const groups: ActionGroup[] = []

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue

    const group = entry as Record<string, unknown>
    const groupName = group.groupName ?? group.name
    if (typeof groupName !== 'string') continue

    // 原版 dz_getActionList：{ name, children:[{ name }] }
    // 本地库：{ groupName, list:[{ group, name }] }
    const children = Array.isArray(group.children) ? group.children : []
    const localItems = Array.isArray(group.list) ? group.list : []
    const items: ActionItem[] = []

    if (children.length > 0) {
      for (const item of children) {
        if (!item || typeof item !== 'object') continue
        const action = item as Record<string, unknown>
        if (typeof action.name !== 'string') continue
        items.push({ group: groupName, name: action.name })
      }
    } else {
      for (const item of localItems) {
        if (!item || typeof item !== 'object') continue
        const action = item as Record<string, unknown>
        if (typeof action.group !== 'string' || typeof action.name !== 'string') continue
        items.push({ group: action.group, name: action.name })
      }
    }

    groups.push({
      groupName,
      show: group.show !== false,
      list: items,
    })
  }

  return groups
}
