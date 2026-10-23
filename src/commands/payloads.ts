import type {
  CreateButtonConfig,
  FontSetSettings,
  PasteFontConfig,
} from '@/cep/data/legacy-settings'
import type { QuickFont } from '@/cep/data/font-extra'
import type { FontItem } from '@/cep/types'
import type { KuKind } from '@/domain/style-library'
import type { DropPosition } from '@/domain/reorder'

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

/**
 * 导入标签（原版 `vg()` 的 Import 模式）。
 *
 * `onConfirm` 在**校验通过之后、落盘之前**调用；返回 false = 取消，一个字都不写。
 */
export interface FontImportTagsPayload {
  onConfirm?: (summary: { tags: number; stars: number; starsReplaced: boolean }) => Promise<boolean>
}

/**
 * 导出标签（原版 `vg()` 的 Export 模式）。
 *
 * `onConfirm` 在**弹保存对话框之前**调用（原文案提醒「不包含字体文件」）。
 */
export interface FontExportTagsPayload {
  onConfirm?: () => Promise<boolean>
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
  /** `am()` 那个布尔：插在目标组前还是后（`domain/reorder.ts` 的 `DropPosition`） */
  position: 'before' | 'after'
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

export type ShortcutScriptGroup = '左侧栏' | '框架模板' | '常用功能' | '字体面板' | '批量套版'

export interface ShortcutScriptsPayload {
  /** 要生成 jsx 的快捷键分组；文件名 `SJZL-<组名>.jsx`（原版命名规则，`08-设置.md:349`） */
  groups: ShortcutScriptGroup[]
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

// ---------- 常用页（/commonUse）----------

/**
 * 缩放。`scale` 是倍数（>100 放大，<100 缩小）。
 * 预设倍率见 `commands/commonUse.ts` 的 `ENLARGE_PRESETS` 等常量。
 */
export interface CommonUseZoomPayload {
  scale: number
}

/** 翻转 6 向：左右 / 上下 / 左 / 右 / 下 / 上 */
export interface CommonUseFlipPayload {
  direction: '左右' | '上下' | '左' | '右' | '下' | '上'
}

/**
 * 嵌入图片的开关集合（原版 comembed 的 4 个勾选 + 3 选 1 单选）。
 * 字段名沿用原版语义；UNVERIFIED：jsx 侧的实际参数形状未实测。
 */
export interface CommonUseEmbedOptions {
  /** 拖入图片自动嵌入图片 */
  autoEmbedOnDrop?: boolean
  /** 粘贴图片自动嵌入图片 */
  autoEmbedOnPaste?: boolean
  /** 使用剪贴蒙版时自动嵌入图片 */
  autoEmbedOnClipboardMask?: boolean
  /** 嵌入时是否存链接对象：none / original / sameFolder */
  linkMode?: 'none' | 'original' | 'sameFolder'
  /** 嵌入时删除下一图层 */
  deleteNextLayer?: boolean
  /** 拖入图片转成链接智能对象 */
  linkSmartObject?: boolean
}

/** 嵌入图片命令的 payload */
export interface CommonUseEmbedPayload {
  options: CommonUseEmbedOptions
}

/** 导入多图片 */
export interface CommonUseImportPayload {
  paths: string[]
}

/** 批量优化文档的三个开关（原版 comoptimization） */
export interface CommonUseOptimizeOptions {
  /** 优化所有智能对象图层 */
  optimizeAll?: boolean
  /** 删除所有空图层 */
  deleteAllEmpty?: boolean
  /** 删除所有隐藏图层 */
  deleteAllHide?: boolean
}

export interface CommonUseOptimizePayload {
  options: CommonUseOptimizeOptions
  /** 参与优化的图层数，用于进度文案「正在优化文档：i/n」 */
  total?: number
}

/**
 * 自定义变换的 7 个参数。
 * 顺序与原版一致（`docs/页面/05-常用.md:57`）：
 * `[number, angle, leftRigth, topBottom, pointIndex, scale, opacity]`。
 */
export interface CommonUseTransformPayload {
  params: [number, number, string, string, number, number, number]
}

/** 参考线动作：开关 / 清除 / 切片 / 安全区 */
export interface CommonUseReferencePayload {
  action: 'toggle' | 'clear' | 'slice' | 'safeArea'
  options?: unknown
}

/** 按间距分布：`[t, width, mode]`（`docs/页面/05-常用.md:63`） */
export interface CommonUseDistributePayload {
  params: [number, number, number]
}

/** 导出图片：first = 一级图层，second = 二级图层，image = 单张导出 */
export interface CommonUseExportPayload {
  mode: 'image' | 'first' | 'second'
  options?: unknown
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
  position: 'before' | 'after'
}

export interface RenameReorderItemPayload {
  fromGroup: number
  fromIndex: number
  toGroup: number
  toIndex: number
  position: 'before' | 'after'
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

/**
 * 拖拽落点移动一项（可跨组）。原版 `drag` 的 `Callback`（`app.v4.js:50052-50069`）：
 * 落点由 `am()` 那个布尔决定"插在目标前还是后"，四分支见 `domain/reorder.ts`。
 * 一次调用 = 一次落盘。
 */
export interface StyleMoveItemPayload extends StyleKuKindPayload {
  fromGroup: number
  fromIndex: number
  toGroup: number
  toIndex: number
  position: DropPosition
}

/** 组头拖拽排序。原版 `dragColorWrap` 的 `Callback`（`app.v4.js:50094-50111`）：同一张四分支表 */
export interface StyleMoveGroupPayload extends StyleKuKindPayload {
  from: number
  to: number
  position: DropPosition
}

// ---------- 样式（/style 第 5 段：仓库切换 / 新建 / 改名 / 删除）----------

/**
 * 仓库索引 `sj_kuStoreInfo.ini` 上的四个写操作（原版 `N_` 的
 * `select` / `add` / `rename` / `delete`，`app.v4.js:53324-53372`）。
 * 只动索引，不动当前仓库的四个库文件。
 */
export interface StyleWarehouseIndexPayload {
  /** 仓库在索引 `list` 里的下标；越界归 0（原版 `select` 同语义，`:53365-53372`） */
  index: number
}

export interface StyleRenameWarehousePayload extends StyleWarehouseIndexPayload {
  name: string
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
  /**
   * 导入标签（原版 `vg()` 的 Import 模式）：覆盖写 `sj_ztglTags.ini`，
   * 文件里带评分时一并覆盖 `sj_ztglStar.ini`。
   */
  'font.importTags': FontImportTagsPayload
  /** 导出标签（原版 `vg()` 的 Export 模式）：只导出标签与评分，不含字体文件 */
  'font.exportTags': FontExportTagsPayload

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
  /** 快速吸色到组（T-66）：切吸色工具 → 等吸色完成 → 把前景色加进该组；取消/超时各有提示 */
  'style.pickColorToGroup': StyleGroupIndexPayload
  'style.addGroup': StyleAddGroupPayload
  'style.renameGroup': StyleRenameGroupPayload
  'style.deleteGroup': StyleGroupIndexPayload
  'style.toggleGroupShow': StyleToggleGroupShowPayload
  'style.addItem': StyleAddItemPayload
  'style.renameItem': StyleRenameItemPayload
  'style.deleteItem': StyleItemRefPayload
  'style.reorderItem': StyleReorderItemPayload
  /** 拖拽落点移动一项（可跨组，原版 `drag` 的 `Callback` `:50052-50069`）：一次调用一次写盘 */
  'style.moveItemTo': StyleMoveItemPayload
  /** 组头拖拽排序（原版 `dragColorWrap` 的 `Callback` `:50094-50111`）：一次调用一次写盘 */
  'style.moveGroupTo': StyleMoveGroupPayload
  'style.sendToSwatch': StyleItemRefPayload
  /** 追加到色板（原版 `app.v4.js:50356-50364`）：读回 seBan → push 该项 → 写回 */
  'style.appendItemToSwatch': StyleItemRefPayload
  /** 整组发送到色板（原版 `:50260-50268`）：该组 list 整份替换 seBan */
  'style.sendGroupToSwatch': StyleGroupIndexPayload
  /** 整组追加到色板（原版 `:50269-50290`）：读回 seBan → 逐项 push → 写回 */
  'style.appendGroupToSwatch': StyleGroupIndexPayload
  /** 切换当前仓库（原版 `N_.select`，`:53365-53372`）：写索引 `index`，越界归 0 */
  'style.selectWarehouse': StyleWarehouseIndexPayload
  /** 新建仓库（原版 `N_.add`，`:53357-53363`）：追加一条「未命名分组」，四库文件名各自生成 */
  'style.addWarehouse': void
  /** 重命名仓库（原版 `N_.rename`，`:53324-53327`）：只改索引里的 `name` */
  'style.renameWarehouse': StyleRenameWarehousePayload
  /** 删除仓库（原版 `N_.delete`，`:53329-53356`）：删索引项 + 修 `index`，磁盘文件移进回收目录 */
  'style.deleteWarehouse': StyleWarehouseIndexPayload

  // 导入导出：底栏两个按钮分别弹「导入」「导出」菜单（契约 §3.5），本期只接 `.kux` 容器。
  // 路径由文件对话框给，命令无参数。
  /** 覆盖导入仓库（`.kux`）：先备份索引，再把旧库文件移进回收目录（契约 §3.4） */
  'style.importKuReplace': void
  /** 追加导入仓库（`.kux`）：只 push 仓库，本地文件不动（契约 §3.4） */
  'style.importKuAppend': void
  /** 导出所有仓库（`.kux`） */
  'style.exportKuAll': void
  /** 导出当前仓库（`.kux`，`store.index = 0`） */
  'style.exportKuCurrent': void

  /** 写快捷键脚本到用户目录 `快捷键脚本/`（原版 manualCopy，`08-设置.md:336`） */
  'system.manualCopyShortcut': ShortcutScriptsPayload
  /** 同一批脚本写到 PS 的 `Presets/Scripts`（原版 copyToScripts，`08-设置.md:372-386`） */
  'system.copyToScripts': ShortcutScriptsPayload
  /** 重新生成配置文件（原版 resetQuickKey，`08-设置.md:368-370`） */
  'system.resetQuickKeys': ShortcutScriptsPayload

  'commonUse.zoom': CommonUseZoomPayload
  'commonUse.flip': CommonUseFlipPayload
  'commonUse.embedImage': CommonUseEmbedPayload
  'commonUse.importMultipleImages': CommonUseImportPayload
  'commonUse.optimizeDoc': CommonUseOptimizePayload
  'commonUse.transform': CommonUseTransformPayload
  'commonUse.referenceLines': CommonUseReferencePayload
  'commonUse.distribute': CommonUseDistributePayload
  'commonUse.exportImages': CommonUseExportPayload
  'commonUse.openExportFolder': void
  'commonUse.swapWireframeFill': void

  'legacy.call': LegacyCallPayload
  'cloud.setUrl': CloudSetUrlPayload
  'cloud.setAutoSync': CloudSetAutoSyncPayload
  'cloud.upload': CloudUploadPayload
  'cloud.download': CloudDownloadPayload
}

export type CommandId = keyof CommandPayloads
