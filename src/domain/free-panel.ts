/**
 * 自由面板真实数据结构。
 *
 * 依据：
 * - 实际文件 `sj_appFreePanel.json`：`{ uid, btnId, obj:{version,type,list:Block[]} }`
 * - 原版 `app.v4.js:1683-1755`：`creatObj` / `addData`
 * - 原版 `app.v4.js:2162-2194`：`$freePanelBox.show / batchShow`
 *
 * 注意：不是 `{ list: Item[] }`。`data` 挂在 block 上，block 可以嵌套 children。
 */
import { shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'
import { isRecord } from '@/utils/guards'

export interface FreePanelItem {
  icon: string
  type: string
  key: string
  btnId: number
  text: string
  funcText: string
  option: unknown
  left: string
  top: string
  position: boolean
  /** 保留原版未知字段，读一次写一次不能丢 */
  [key: string]: unknown
}

export interface FreePanelBlock {
  id: number
  zIndex: number | string
  showIcon: boolean
  showNumber: number
  /** 是否显示按钮文字；旧数据没有这个字段时按 true */
  showText?: boolean
  type: 'row' | 'norow' | string
  width?: string
  height?: string
  children: FreePanelBlock[]
  data: FreePanelItem[]
  /** 保留原版未知字段 */
  [key: string]: unknown
}

export interface FreePanelFile {
  uid: number
  btnId: number
  obj: {
    version: string
    type: 'row' | 'norow' | string
    list: FreePanelBlock[]
    [key: string]: unknown
  }
  /** 保留原版未知字段 */
  [key: string]: unknown
}

/** 新建自由面板：一个空 block，够动作/字体先落项 */
export function createEmptyFreePanel(): FreePanelFile {
  return {
    uid: 1,
    btnId: 0,
    obj: {
      version: '1.0',
      type: 'row',
      list: [
        {
          id: 1,
          zIndex: 0,
          showIcon: false,
          showNumber: 2,
          showText: true,
          type: 'norow',
          width: '100%',
          height: '100%',
          children: [],
          data: [],
        },
      ],
    },
  }
}

function normalizeItem(raw: unknown): FreePanelItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  if (typeof item.key !== 'string' || typeof item.text !== 'string') return null
  return {
    // 保留未知字段；已知字段再归一
    ...item,
    icon: typeof item.icon === 'string' ? item.icon : '',
    type: typeof item.type === 'string' ? item.type : '',
    key: item.key,
    btnId: typeof item.btnId === 'number' ? item.btnId : 0,
    text: item.text,
    funcText: typeof item.funcText === 'string' ? item.funcText : '',
    // 原版实际存在 option:null；只有 undefined 才补 {}
    option: 'option' in item ? item.option : {},
    left: typeof item.left === 'string' ? item.left : '',
    top: typeof item.top === 'string' ? item.top : '',
    position: item.position === true,
  }
}

function normalizeBlock(raw: unknown, fallbackId: number): FreePanelBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const block = raw as Record<string, unknown>
  const children = Array.isArray(block.children)
    ? block.children
        .map((child, index) => normalizeBlock(child, fallbackId + index + 1))
        .filter((child): child is FreePanelBlock => Boolean(child))
    : []
  const data = Array.isArray(block.data)
    ? block.data.map(normalizeItem).filter((item): item is FreePanelItem => Boolean(item))
    : []

  return {
    // 保留未知字段；已知字段再归一
    ...block,
    id: typeof block.id === 'number' ? block.id : fallbackId,
    zIndex: typeof block.zIndex === 'number' || typeof block.zIndex === 'string' ? block.zIndex : 0,
    showIcon: block.showIcon === true,
    showNumber: typeof block.showNumber === 'number' ? block.showNumber : 2,
    showText: block.showText !== false,
    type: typeof block.type === 'string' ? block.type : 'norow',
    width: typeof block.width === 'string' ? block.width : undefined,
    height: typeof block.height === 'string' ? block.height : undefined,
    children,
    data,
  }
}

/**
 * 形状判据：`obj.list` 必须是数组。这是 `FreePanelFile` 唯一的结构前提，
 * 也是页面/命令能直接写 `file.obj.list` 的全部依据。
 *
 * **只写这一份**：`normalizeFreePanel` 与读边界 `readFreePanelFile` 都走这里；
 * 在别处再写一次 `obj?.list ?? []` 就是第二份"什么算合法文件"。
 */
function hasPanelList(raw: unknown): raw is { obj: { list: unknown[] } } {
  if (!raw || typeof raw !== 'object') return false
  const obj = (raw as Record<string, unknown>).obj
  return Boolean(obj) && typeof obj === 'object' && Array.isArray((obj as { list?: unknown }).list)
}

/** 只做结构归一，不丢 block；非法项丢弃。形状不认识时给一个空面板 */
export function normalizeFreePanel(raw: unknown): FreePanelFile {
  if (!hasPanelList(raw)) return createEmptyFreePanel()
  const file = raw as Record<string, unknown>
  const obj = raw.obj as Record<string, unknown>
  const blocks = raw.obj.list
    .map((block, index) => normalizeBlock(block, index + 1))
    .filter((block): block is FreePanelBlock => Boolean(block))

  return {
    // 保留顶层未知字段
    ...file,
    uid: typeof file.uid === 'number' ? file.uid : blocks.length,
    btnId: typeof file.btnId === 'number' ? file.btnId : 0,
    obj: {
      // 保留 obj 未知字段
      ...obj,
      version: typeof obj.version === 'string' ? obj.version : '1.0',
      type: typeof obj.type === 'string' ? obj.type : 'row',
      // 空 list 也是合法状态；只有文件缺失/形状不认识时才用默认 block
      list: blocks,
    },
  }
}

/**
 * 读边界归一（`data/free-panel.ts` 传给 `fileRepo` 的 `normalize`）。
 *
 * 与 `normalizeFreePanel` 的唯一区别：**形状不认识返回 `null`**，由 `file-repo` 转成
 * `degraded` + fallback，页面据此提示。在这里补一个空面板就等于静默回退——
 * 坏文件和"面板本来就是空的"从此分不开（硬规则 20(b)）。
 */
export function readFreePanelFile(raw: unknown): FreePanelFile | null {
  return hasPanelList(raw) ? normalizeFreePanel(raw) : null
}

/** 读边界：`readFreePanelFile` 是形状判据，这里补 `Decoded` 的壳并给失败原因 */
export function decodeFreePanelFile(raw: unknown): Decoded<FreePanelFile> | DecodeFail {
  const file = readFreePanelFile(raw)
  if (file !== null) return { value: file }
  // 判据是「`obj.list` 必须是数组」⇒ 报那个字段，别只说"结构不认识"
  const list = isRecord(raw) && isRecord(raw.obj) ? raw.obj.list : raw
  return shapeFail('obj.list', 'array', list)
}

/** 深度优先遍历 block；回调返回 true 可提前停止 */
export function walkBlocks(
  blocks: FreePanelBlock[],
  visit: (block: FreePanelBlock) => boolean | void,
): boolean {
  for (const block of blocks) {
    if (visit(block)) return true
    if (walkBlocks(block.children, visit)) return true
  }
  return false
}

export function findBlock(blocks: FreePanelBlock[], id: number): FreePanelBlock | undefined {
  let found: FreePanelBlock | undefined
  walkBlocks(blocks, (block) => {
    if (block.id !== id) return false
    found = block
    return true
  })
  return found
}
