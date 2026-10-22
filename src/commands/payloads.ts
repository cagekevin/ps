import type {
  CreateButtonConfig,
  FontSetSettings,
  PasteFontConfig,
} from '@/cep/data/legacy-settings'
import type { QuickFont } from '@/cep/data/font-extra'
import type { FontItem } from '@/cep/types'
import type { KuKind } from '@/domain/style-library'

/**
 * 命令 id → payload 类型的**唯一映射**。
 *
 * 为什么需要：`useCommand<P>` 的 P 如果由调用方自己写，传错 payload 编译不报错，
 * 只在运行时炸。有了这张表，`execute(id, payload)` 和 `useCommand(id).run(payload)`
 * 都由 id 推断类型，传错字段直接编译失败。
 *
 * 新增命令：先在这里加一行，再写实现（`defineCommand` 会强制 id 在表里）。
 */
export interface ApplyFontPayload {
  font: FontItem
  variantIndex: number
}

export interface RatePayload {
  family: string
  value: number
}

export interface TagTextPayload {
  text: string
}

export interface RenameTagPayload {
  from: string
  to: string
}

export interface ToggleTagPayload {
  tagText: string
  family: string
}

export interface CallActionPayload {
  group: string
  name: string
  alias?: string
}

export interface GroupCreatePayload {
  name: string
  /** 原版 data.addGroup(name, afterIndex)：插到该分组之后；不传则追加 */
  afterIndex?: number
}

export interface GroupRenamePayload {
  index: number
  name: string
}

export interface GroupIndexPayload {
  index: number
}

export interface ActionItemRef {
  groupIndex: number
  itemIndex: number
}

export interface SetAliasPayload extends ActionItemRef {
  alias: string
}

export interface AddFromPsPayload {
  groupIndex: number
  items: Array<{ group: string; name: string }>
}

export interface AddWarehousePayload {
  name?: string
}

export interface RenameWarehousePayload {
  index: number
  name: string
}

export interface DeleteWarehousePayload {
  index: number
}

export interface ReorderGroupPayload {
  from: number
  to: number
}

export interface ReorderItemPayload {
  fromGroup: number
  fromIndex: number
  toGroup: number
  toIndex: number
  position: 'before' | 'after'
}

export interface SetListTypePayload {
  columns: 1 | 2 | 3
}

export interface ExportWarehousePayload {
  current: boolean
}

export interface ImportWarehousePayload {
  append: boolean
}

export type ActionImportDefaultPayload = Record<string, never>

export interface FreePanelItemInput {
  text: string
  key: string
  option?: unknown
  icon?: string
  type?: string
  funcText?: string
}

export interface FreePanelAddPayload {
  blockId: number
  items: FreePanelItemInput[]
}

export interface FreePanelRemovePayload {
  blockId: number
  btnId: number
}

export interface FreePanelReorderPayload {
  fromBlockId: number
  fromBtnId: number
  toBlockId: number
  toBtnId: number
  position: 'before' | 'after'
}

export interface FreePanelExecutePayload {
  blockId: number
  btnId: number
}

export interface FreePanelDisplayPayload {
  showNumber?: 2 | 3 | 4
  showIcon?: boolean
  showText?: boolean
}

export interface FreePanelClearPayload {
  /** 保留空工作区；不传等价于 clear */
  all?: boolean
}

export interface FreePanelAddBlockPayload {
  parentId?: number
  type?: 'row' | 'norow'
}

export interface FreePanelRemoveBlockPayload {
  blockId: number
}

export interface FreePanelSetBlockPayload {
  blockId: number
  type?: 'row' | 'norow'
  width?: string
  height?: string
}

export interface LegacyCallPayload {
  key: string
  args: unknown[]
  label?: string
}

export interface CloudSetUrlPayload {
  url: string
}

export interface CloudSetAutoSyncPayload {
  enabled: boolean
}

export interface CloudUploadPayload {
  /** 手动确认覆盖云端；自动同步不传 */
  force?: boolean
  onConfirm?: (decision: import('@/domain/cloud').UploadDecision) => Promise<boolean>
}

export interface CloudDownloadPayload {
  onConfirm?: (diff: import('@/domain/cloud').SyncDiff) => Promise<boolean>
}

// ---------- 字体面板（/fontSet）----------

export interface FontSetAlignPayload {
  /** h 水平 / v 垂直 / bg-h 与背景水平 / bg-v 与背景垂直 */
  axis: 'h' | 'v' | 'bg-h' | 'bg-v'
  /** 0-2 普通对齐，3 居中分布 */
  index: number
}

export interface FontSetDistributePayload {
  /** 1 垂直分布 / 2 水平分布（原版 showDistribution） */
  axis: 1 | 2
  value: string
}

export interface FontSetSplitPayload {
  mode: 1 | 2 | 3 | 4
}

export interface FontSetCreateButtonPayload {
  config: CreateButtonConfig
}

export interface FontSetPasteFontPayload {
  keeps: PasteFontConfig
}

export interface FontSetTranslatePayload {
  from: string
  to: string
  replace: boolean
}

export interface FontSetTextAlignPayload {
  index: number
  /** 原版第二参数：shift 按住时设置点文本；不传表示只传一个参数（层级面板） */
  shift?: boolean
  /** ctrl 按住时走段落对齐 */
  paragraph: boolean
}

export interface FontSetNumberPayload {
  value: number
}

export interface FontSetStyleTogglePayload {
  kind: 'caps' | 'kerning' | 'italic' | 'bold'
  value: boolean
}

export interface FontSetFontNamePayload {
  /** family：原版 squarecom 选字体，走 selectLayer 回读；weight：只改本地 weight */
  kind: 'family' | 'weight'
  postScriptName: string
  name: string
  weight: string
  /** 家族名，用于记录最近使用；weight 时也带 */
  family?: string
}

export interface FontSetSaveSettingsPayload {
  patch: Partial<FontSetSettings>
}

export interface FontSetQuickFontPayload {
  action: 'add' | 'apply' | 'select' | 'delete'
  index?: number
  weightIndex?: number
  font?: QuickFont
}

export interface FontSetHierarchyPresetPayload {
  action: 'save' | 'create' | 'rename' | 'delete' | 'select'
  name?: string
  index?: number
  /** save / create 时的 6 级字号；页面当前值由页面传入，命令不猜 */
  levels?: number[]
}

// ---------- 重命名（/rename）----------

export interface RenameBatchPayload {
  /** 表达式原文，求值在 PS 侧（cmm_batchName） */
  expression: string
  /** 是否过滤子图层（原版 filterFun：勾选 1 个才为 true，app.v4.js:57011） */
  filterChildren: boolean
}

export interface RenameLayerColorPayload {
  /** 1-7 对应七色，0 = 清除（app.v4.js:56736 / :56757） */
  colorIndex: number
}

export interface RenameGroupAddPayload {
  name: string
  /** 原版 data.addGroup(name, afterIndex)：插到该组之后；不传则追加 */
  afterIndex?: number
}

export interface RenameGroupRenamePayload {
  index: number
  name: string
}

export interface RenameGroupIndexPayload {
  index: number
}

export interface RenameItemRefPayload {
  groupIndex: number
  itemIndex: number
}

export interface RenameItemTextPayload extends RenameItemRefPayload {
  text: string
}

export interface RenameItemAddPayload {
  groupIndex: number
  text: string
}

export interface RenameReorderGroupPayload {
  from: number
  to: number
}

export interface RenameReorderItemPayload {
  fromGroup: number
  fromIndex: number
  toGroup: number
  toIndex: number
}

// ---------- 样式（/style 第 2 段）----------

/**
 * 原版 `useColor` 的修饰键路由（不是降级链）：
 * `ft.f` = ctrl/meta、`ft.g` = shift、`ft.e` = alt（`app.v4.js:70622-70638`），
 * ctrl→`ys_useShapeFill`、shift→`ys_setBorderColor`、alt→`cy_changeStyleColor`、
 * 无修饰键→`ys_useStyleColor`（`:50128-50163`）。
 */
export type StyleModifier = 'ctrl' | 'shift' | 'alt' | 'none'

export interface StyleApplyColorPayload {
  groupIndex: number
  itemIndex: number
  modifier: StyleModifier
}

export interface StyleApplyGradientPayload {
  groupIndex: number
  itemIndex: number
}

export interface StyleApplyStylePayload {
  groupIndex: number
  itemIndex: number
}

/** 应用字体：原版 `useFont`（`app.v4.js:51187-51228`）先 `ys_checkUseFont` 再 `ys_useFont` */
export interface StyleApplyFontPayload {
  groupIndex: number
  itemIndex: number
}

/** 添加：从 PS 读当前前景色 / 渐变 / 字体属性 / 图层样式，写进当前仓库的第 groupIndex 组 */
export interface StyleAddColorPayload {
  groupIndex: number
}

export interface StyleAddGradientPayload {
  groupIndex: number
}

export interface StyleAddStylePayload {
  groupIndex: number
}

/** 添加字体：原版 `addFont`（`app.v4.js:51230-51277`）读 `ys_getFontInfo` 的 `data` 整份入库 */
export interface StyleAddFontPayload {
  groupIndex: number
}

// ---------- 样式（/style 第 3 段：分组 / 项的增删改 + 写库）----------

/**
 * 改哪个库。四类库的组结构不同（只有样式库的组带 `id`，契约 §2.3），
 * 所以每条写命令都必须带上 `kind`，命令层不猜"当前 tab 是哪个库"。
 */
export interface StyleKuKindPayload {
  kind: KuKind
}

export interface StyleAddGroupPayload extends StyleKuKindPayload {
  name: string
  /** 原版 `addGroup(name, afterIndex)`：插到该组之后；不传则追加（`app.v4.js:52437-52449`） */
  afterIndex?: number
}

export interface StyleRenameGroupPayload extends StyleKuKindPayload {
  groupIndex: number
  name: string
}

export interface StyleGroupIndexPayload extends StyleKuKindPayload {
  groupIndex: number
}

export interface StyleToggleGroupShowPayload extends StyleGroupIndexPayload {
  /** `true` = 只显示这一组（原版 `showOnlyGroup`）；不传 = 取反（`app.v4.js:52415-52418`） */
  only?: boolean
}

export interface StyleAddItemPayload extends StyleKuKindPayload {
  groupIndex: number
  /** 项按开放结构传：命令不认字段、不补键（契约 §7 第 8 条） */
  item: Record<string, unknown>
}

export interface StyleRenameItemPayload extends StyleGroupIndexPayload {
  itemIndex: number
  name: string
}

export interface StyleItemRefPayload extends StyleGroupIndexPayload {
  itemIndex: number
}

export interface StyleReorderItemPayload extends StyleItemRefPayload {
  direction: 'up' | 'down'
}

export interface CommandPayloads {
  'font.apply': ApplyFontPayload
  'font.rate': RatePayload
  'font.createTag': TagTextPayload
  'font.renameTag': RenameTagPayload
  'font.deleteTag': TagTextPayload
  'font.toggleTag': ToggleTagPayload
  /** 无参数 */
  'font.refreshList': void

  'fontSet.align': FontSetAlignPayload
  'fontSet.alignHorizontal': void
  'fontSet.distribute': FontSetDistributePayload
  'fontSet.split': FontSetSplitPayload
  'fontSet.createButton': FontSetCreateButtonPayload
  'fontSet.copyFont': void
  'fontSet.pasteFont': FontSetPasteFontPayload
  'fontSet.switchDirection': void
  'fontSet.translate': FontSetTranslatePayload
  'fontSet.textAlign': FontSetTextAlignPayload
  'fontSet.hierarchySize': FontSetNumberPayload
  'fontSet.fontSize': FontSetNumberPayload
  'fontSet.leading': FontSetNumberPayload
  'fontSet.tracking': FontSetNumberPayload
  'fontSet.color': void
  'fontSet.fontName': FontSetFontNamePayload
  'fontSet.styleToggle': FontSetStyleTogglePayload
  'fontSet.saveSettings': FontSetSaveSettingsPayload
  'fontSet.quickFont': FontSetQuickFontPayload
  'fontSet.hierarchyPreset': FontSetHierarchyPresetPayload

  'action.call': CallActionPayload
  'action.addGroup': GroupCreatePayload
  'action.renameGroup': GroupRenamePayload
  'action.deleteGroup': GroupIndexPayload
  'action.deleteItem': ActionItemRef
  'action.setAlias': SetAliasPayload
  'action.deleteAlias': ActionItemRef
  'action.addFromPs': AddFromPsPayload
  'action.selectWarehouse': GroupIndexPayload
  'action.toggleGroup': GroupIndexPayload
  'action.addWarehouse': AddWarehousePayload
  'action.renameWarehouse': RenameWarehousePayload
  'action.deleteWarehouse': DeleteWarehousePayload
  'action.reorderGroup': ReorderGroupPayload
  'action.reorderItem': ReorderItemPayload
  'action.setListType': SetListTypePayload
  'action.exportWarehouse': ExportWarehousePayload
  'action.importWarehouse': ImportWarehousePayload
  'action.importDefault': ActionImportDefaultPayload

  'freePanel.add': FreePanelAddPayload
  'freePanel.remove': FreePanelRemovePayload
  'freePanel.reorder': FreePanelReorderPayload
  'freePanel.execute': FreePanelExecutePayload
  'freePanel.setDisplay': FreePanelDisplayPayload
  'freePanel.clear': FreePanelClearPayload
  'freePanel.addBlock': FreePanelAddBlockPayload
  'freePanel.removeBlock': FreePanelRemoveBlockPayload
  'freePanel.setBlock': FreePanelSetBlockPayload

  'rename.batchName': RenameBatchPayload
  'rename.setLayerColor': RenameLayerColorPayload
  'rename.toggleGroup': RenameGroupIndexPayload
  'rename.addGroup': RenameGroupAddPayload
  'rename.renameGroup': RenameGroupRenamePayload
  'rename.deleteGroup': RenameGroupIndexPayload
  'rename.addItem': RenameItemAddPayload
  'rename.changeItem': RenameItemTextPayload
  'rename.deleteItem': RenameItemRefPayload
  'rename.reorderGroup': RenameReorderGroupPayload
  'rename.reorderItem': RenameReorderItemPayload
  /** 导出/导入走文件对话框，无参数 */
  'rename.exportPreset': void
  'rename.importPreset': void

  'style.applyColor': StyleApplyColorPayload
  'style.applyGradient': StyleApplyGradientPayload
  'style.applyFont': StyleApplyFontPayload
  'style.applyStyle': StyleApplyStylePayload
  'style.addColor': StyleAddColorPayload
  'style.addGradient': StyleAddGradientPayload
  'style.addFont': StyleAddFontPayload
  'style.addStyle': StyleAddStylePayload
  'style.addGroup': StyleAddGroupPayload
  'style.renameGroup': StyleRenameGroupPayload
  'style.deleteGroup': StyleGroupIndexPayload
  'style.toggleGroupShow': StyleToggleGroupShowPayload
  'style.addItem': StyleAddItemPayload
  'style.renameItem': StyleRenameItemPayload
  'style.deleteItem': StyleItemRefPayload
  'style.reorderItem': StyleReorderItemPayload
  'style.sendToSwatch': StyleItemRefPayload
  /** 追加到色板（原版 `app.v4.js:50356-50364`）：读回 seBan → push 该项 → 写回 */
  'style.appendItemToSwatch': StyleItemRefPayload
  /** 整组发送到色板（原版 `:50260-50268`）：该组 list 整份替换 seBan */
  'style.sendGroupToSwatch': StyleGroupIndexPayload
  /** 整组追加到色板（原版 `:50269-50290`）：读回 seBan → 逐项 push → 写回 */
  'style.appendGroupToSwatch': StyleGroupIndexPayload

  'legacy.call': LegacyCallPayload
  'cloud.setUrl': CloudSetUrlPayload
  'cloud.setAutoSync': CloudSetAutoSyncPayload
  'cloud.upload': CloudUploadPayload
  'cloud.download': CloudDownloadPayload
}

export type CommandId = keyof CommandPayloads
