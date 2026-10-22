<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import BackTop from '@/components/BackTop.vue'
import BaseGroup from '@/components/BaseGroup.vue'
import CepModal from '@/components/CepModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import GButton from '@/components/GButton.vue'
import GDropdown from '@/components/GDropdown.vue'
import GInput from '@/components/GInput.vue'
import Icon from '@/components/Icon.vue'
import MultiTabs from '@/components/MultiTabs.vue'
import PageBottomBar from '@/components/PageBottomBar.vue'
import { useCommand } from '@/components/command/useCommand'
import { useDismiss } from '@/composables/useDismiss'
import { useFloatingPosition } from '@/composables/useFloatingPosition'
import { useLongPressDrag, type LongPressDragResult } from '@/composables/useLongPressDrag'
import { usePersistedRef } from '@/composables/usePersisted'
import { userDir } from '@/cep/fs'
import {
  KU_KINDS,
  KU_TAB_LABELS,
  type KuFontPreview,
  type KuItem,
  type KuKind,
} from '@/domain/style-library'
import { useConfirmStore } from '@/stores/confirm'
import { useFeedbackStore } from '@/stores/feedback'
import { useStyleLibraryStore } from '@/stores/style-library'
import type { StyleModifier } from '@/commands/payloads'
import StyleMenu, { type StyleMenuEntry } from './components/StyleMenu.vue'

/**
 * 样式页（`/style`）。
 *
 * 结构对照原版 `EC()`（`app.v4.js:49616-49885`）：
 * 仓库条（49650）→ 4 tab（49653）→ 四库列表（49685）→ 底栏（49844）→ 回顶（49828）。
 *
 * 第 1 段：只读骨架 + 三态。第 2 段：应用（7 条 jsx）与添加（4 条 jsx）经 `useCommand` 接上。
 * 第 3 段：项 / 分组右键菜单（清单 #32-50）——删改走 `style.deleteItem|renameItem|deleteGroup|renameGroup`，
 * 新建组走 `style.addGroup`，发送到色板走 `style.sendToSwatch`。
 * 第 4 段：组头 `ctrl+点击` → `style.toggleGroupShow`（`only`），普通点击折叠/展开也走同一条命令写库；
 * 底栏四个「添加×分组」→ `style.addGroup`。
 * 第 5 段：项 / 组的拖拽排序 —— 原版 `am()` 那套长按机制（`composables/useLongPressDrag`），
 * 落点走 `style.moveItemTo` / `style.moveGroupTo`，一次拖拽只写一次盘。
 * 第 6 段：底栏「导入」「导出」两个按钮各弹菜单（契约 §3.5），
 * 接到 `commands/style.ts` 第 6 段的 4 条 `.kux` 命令；导入成功后重读当前仓库。
 * 本期仍不做：吸色到组、拖图片取色、仓库发送/移动（菜单项已渲染但置灰，命令未实现）。
 *
 * 两处**有意偏离原版**：
 * 1. 删除要二次确认（原版 `:50329-50332` / `:50245-50248` 直接删 + tips）：误删会写坏用户库，
 *    而写库备份只留一份 `.bak`，没有撤销入口。走 `useConfirmStore`（ConfirmHost 里的 `CepModal`）。
 * 2. 「发送到仓库…」「移动到仓库…」渲染但置灰：`$emit("sendWarehouse"|"moveWarehouse")` 对应的
 *    写库命令还没实现，原版菜单项不能凭空可用。置灰项的 `title` 写明未实现，台账编号待登记。
 *
 * 原版没有页面标题栏（标题由左侧导航承担），所以不用 `PageShell`。
 */
const store = useStyleLibraryStore()
const confirm = useConfirmStore()
const feedback = useFeedbackStore()
const { libraries, loading, error, currentName, warehouses, activeIndex } = storeToRefs(store)

/** 原版 `set.ysShowTab`（`app.v4.js:54657` 起 switchFun 读写它）；我们落 `sj_v5_ui.json`，不动 `sj_set.json` */
const showTabs = usePersistedRef<boolean[]>('styleShowTab', [true, false, false, false])

/**
 * 仓库下拉（原版 warehouse 组件 `app.v4.js:53747-53909`）的交互状态。
 *
 * 三个本地态逐个对应原版 data（`:53925-53933`）：
 * `showDown` → `warehouseOpen`、`showMore` → `hoverIndex`、`showEdit`/`editValue` → `editingIndex`/`editValue`。
 * 原版靠 `$store.state.showMenu == 1` 做"点空白收起"（`:53785` / `:53960`），我们用 `useDismiss`，
 * 不新造全局状态。
 */
const warehouseOpen = ref(false)
/** hover 到哪一行；-1 = 没有（原版 `showMore`，`mouseenter` 置 i / `mouseleave` 置 -1，`:53794-53799`） */
const hoverIndex = ref(-1)
/** 正在改名的那一行；-1 = 没有（原版 `showEdit`） */
const editingIndex = ref(-1)
const editValue = ref('')
const warehouseRoot = ref<HTMLElement | null>(null)

/** 缩略图 `<id>.png` 加载失败的那几项：失败就不再画 `<img>`，只留原版那层 rgba(0,0,0,.3) 底 */
const brokenThumbs = ref<Set<string>>(new Set())

/**
 * 项 hover 浮层（T-60）。
 *
 * 内容是**已有视图模型字段**（`KuItem.name` / `swatch` / `fontPreview` / `image` + 分组名 + 库名），
 * 不新造数据结构；定位统一走 `composables/useFloatingPosition`（上方优先、贴顶翻转、右边界内收）。
 * 原版 `.describe` 只在颜色 / 字体库出现，这里四库都有（信息量不同，见 `describeDetail`）。
 */
const describe = ref<{
  kind: KuKind
  groupIndex: number
  itemIndex: number
  el: HTMLElement
} | null>(null)
const describeRef = ref<HTMLElement | null>(null)

const describeAnchor = computed(() => describe.value?.el ?? null)
const { update: updateDescribe } = useFloatingPosition({
  reference: describeAnchor,
  floating: describeRef,
  // 原版浮层在项上方；空间不够由 composable 翻到下方，右边越界由它夹回视口
  placement: 'top-start',
  offset: 6,
  padding: 8,
})

/** 浮层里能显示什么，只用已有字段：颜色给色值、字体给家族/字重/字号、图片型渐变给标记 */
function describeDetail(kind: KuKind, item: KuItem): string {
  if (kind === 'color' && item.swatch) return `色值 ${item.swatch.toUpperCase()}`

  if (kind === 'font' && item.fontPreview) {
    const preview = item.fontPreview
    const parts = [preview.family, preview.weight, preview.size].filter(Boolean)
    if (preview.count > 1) parts.push(`${preview.count} 个字体`)
    return parts.join(' · ')
  }

  if (kind === 'gradient' && item.image) return '图片型渐变'
  return ''
}

const describeContent = computed(() => {
  const target = describe.value
  if (!target) return null

  const group = libraries.value[target.kind][target.groupIndex]
  const item = group?.items[target.itemIndex]
  if (!group || !item) return null

  return {
    name: item.name,
    subtitle: `${group.name} · ${KU_TAB_LABELS[KU_KINDS.indexOf(target.kind)]}库`,
    detail: describeDetail(target.kind, item),
  }
})

function showDescribe(event: MouseEvent, kind: KuKind, groupIndex: number, itemIndex: number) {
  const el = event.currentTarget
  if (!(el instanceof HTMLElement)) return

  describe.value = { kind, groupIndex, itemIndex, el }
  void nextTick(updateDescribe)
}

function hideDescribe() {
  describe.value = null
}

// 浮层是 fixed 定位：滚动 / 改窗口大小都要重算，否则会飘在别处
function bindDescribeViewport(on: boolean) {
  const method = on ? 'addEventListener' : 'removeEventListener'
  window[method]('resize', updateDescribe)
  document[method]('scroll', updateDescribe, true)
}

watch(describe, (value) => bindDescribeViewport(!!value))
onBeforeUnmount(() => bindDescribeViewport(false))

const applyColorCmd = useCommand('style.applyColor')
const applyGradientCmd = useCommand('style.applyGradient')
const applyFontCmd = useCommand('style.applyFont')
const applyStyleCmd = useCommand('style.applyStyle')
const addColorCmd = useCommand('style.addColor')
const addGradientCmd = useCommand('style.addGradient')
const addFontCmd = useCommand('style.addFont')
const addStyleCmd = useCommand('style.addStyle')
const pickColorToGroupCmd = useCommand('style.pickColorToGroup')
const toggleGroupShowCmd = useCommand('style.toggleGroupShow')
const deleteItemCmd = useCommand('style.deleteItem')
const renameItemCmd = useCommand('style.renameItem')
const sendToSwatchCmd = useCommand('style.sendToSwatch')
const appendItemToSwatchCmd = useCommand('style.appendItemToSwatch')
const sendGroupToSwatchCmd = useCommand('style.sendGroupToSwatch')
const appendGroupToSwatchCmd = useCommand('style.appendGroupToSwatch')
const addGroupCmd = useCommand('style.addGroup')
const deleteGroupCmd = useCommand('style.deleteGroup')
const renameGroupCmd = useCommand('style.renameGroup')
const moveItemToCmd = useCommand('style.moveItemTo')
const moveGroupToCmd = useCommand('style.moveGroupTo')
const selectWarehouseCmd = useCommand('style.selectWarehouse')
const addWarehouseCmd = useCommand('style.addWarehouse')
const renameWarehouseCmd = useCommand('style.renameWarehouse')
const deleteWarehouseCmd = useCommand('style.deleteWarehouse')

/**
 * 底栏导入 / 导出菜单（契约 §3.5：底栏两个按钮，分别弹「导入」「导出」）。
 * 本期菜单只有 `.kux` 容器的两项：导入追加 / 导入替换、导出全部 / 导出当前。
 */
const importMenu = ref(false)
const exportMenu = ref(false)
const importKuReplaceCmd = useCommand('style.importKuReplace')
const importKuAppendCmd = useCommand('style.importKuAppend')
const exportKuAllCmd = useCommand('style.exportKuAll')
const exportKuCurrentCmd = useCommand('style.exportKuCurrent')

/**
 * 导入 / 导出入口。
 *
 * 先收起菜单再跑命令（菜单留着会挡住文件对话框关掉后的 toast）；
 * 导入成功要 `store.load()`：覆盖导入会换掉索引，追加导入会多出仓库，页面必须重读。
 * 失败 / 取消由 `useCommand` 统一提示，这里不写 try/catch。
 */
async function importArchive(append: boolean) {
  importMenu.value = false
  const ok = await (append ? importKuAppendCmd : importKuReplaceCmd).run()
  if (ok) await store.load()
}

async function exportArchive(current: boolean) {
  exportMenu.value = false
  await (current ? exportKuCurrentCmd : exportKuAllCmd).run()
}

const visibleKinds = computed(() => KU_KINDS.filter((_, index) => !!showTabs.value[index]))

/** 四个库都没有分组才算"空库"；某个库单独空由该库自己的提示承担 */
const isEmpty = computed(() =>
  visibleKinds.value.every((kind) => libraries.value[kind].length === 0),
)

/**
 * 组的展开/折叠与"仅显示该组"都写库：原版组头的 `change` 一律走 `changeGroupShowStatus(index, event.ctrl)`
 * （颜色 `setGroupShowStatus` `:50177-50179`、渐变 `setGroupShow` `:50797-50799`、
 * 字体 `changGroupStatus` `:51113-51115`、样式 `setShowStatus` `:51560-51562`），
 * `ctrl` 为真时是 `showOnlyGroup`（`:52420-52435`），否则取反并 `updata()`（`:52417`）。
 * 所以折叠状态在库文件的 `show` 字段里，页面不再自己存一份（页面 ref 刷新即丢）。
 */
async function setGroupShow(kind: KuKind, groupIndex: number, only: boolean) {
  const ok = only
    ? await toggleGroupShowCmd.run({ kind, groupIndex, only: true })
    : await toggleGroupShowCmd.run({ kind, groupIndex })
  if (ok) await store.load()
}

/** 四类库的项尺寸各不同（CSS 按这个类分派，见 index.css 的实测依据） */
function libClass(kind: string): string {
  return `style-lib--${kind}`
}

/**
 * 「按住ctrl拖拽位置」提示挂哪一层：原版颜色 `:49925` / 渐变 `:50508` / 字体 `:50894` 挂在
 * "所有组"外面那一层，样式库没有那一层，挂在每个组容器上（`:51316`）。`undefined` = 不渲染 title。
 */
function dragTitle(kind: KuKind): string | undefined {
  return kind === 'style' ? undefined : '按住ctrl拖拽位置'
}

/** 样式库的提示挂在每个组容器上（原版 `:51316`）；另外三库已经在整库外层挂了，组容器上不重复 */
function groupTitle(kind: KuKind): string | undefined {
  return kind === 'style' ? '按住ctrl拖拽位置' : undefined
}

/**
 * 颜色库内容区的完整提示（原版 render `:49955`，挂在 `.f-baseX.f-br` 容器上，即我们的 `.style-items`）：
 * 只有颜色库这一句带 shift / alt 的说明，另外三库没有。
 */
function itemsTitle(kind: KuKind): string | undefined {
  return kind === 'color' ? 'shift+点击设置描边，alt+点击更改颜色，按住ctrl拖拽位置' : undefined
}

/**
 * 各组末尾「+」的 title：原版四库各写各的
 * （颜色 `:49991`、渐变 `:50572`、字体 `:50985`、样式 `:51378`）。
 * 写错库名等于告诉用户点了会发生另一件事——字体那个「+」现在加的是字体，不是前景色。
 */
const ADD_TITLE: Record<KuKind, string> = {
  color: '添加当前前景色',
  gradient: '添加渐变色，仅支持形状图层',
  font: '添加字体，支持多图层',
  style: '添加样式',
}

/**
 * 用户目录只取一次：`userDir()` 每次都要过 CEP 的 Node 桥（`cep/fs.ts` 的 `nodeRequire`），
 * 而一屏几百个缩略图每帧要拼一次路径，逐项现取会把渲染拖成同步桥调用风暴。
 */
let cachedUserDir: string | null = null
function userDirOnce(): string {
  if (cachedUserDir === null) {
    try {
      cachedUserDir = userDir()
    } catch {
      cachedUserDir = ''
    }
  }
  return cachedUserDir
}

/**
 * 用户目录下某个资源的绝对路径。
 *
 * 原版 `src = isMac + <目录> + "/" + <文件名>`（渐变 `:50561`、样式缩略图 `:51352`），
 * `isMac = getOsPrefix()`（Mac `"file://"`、Windows `""`，`:72855-72862`）。
 * 没有 Node 的环境（浏览器 dev / 测试）拿不到目录就返回空串，由模板退化成"不画图"，
 * **不能让它把整页渲染打断**。
 */
function userFileSrc(relative: string): string {
  const dir = userDirOnce()
  return dir ? `${dir}/${relative}` : ''
}

/** 图片型渐变：`<userDir>/Gradient/<fileName>`（`path.kuGradient`，`:5225`） */
function gradientImageSrc(fileName = ''): string {
  return fileName ? userFileSrc(`Gradient/${fileName}`) : ''
}

/** 图层样式缩略图：`<userDir>/kuStyle/<id>.png`（`path.kuStyle`，`:5223`） */
function styleThumbSrc(thumb = ''): string {
  return thumb ? userFileSrc(`kuStyle/${thumb}`) : ''
}

function onThumbError(thumb: string) {
  brokenThumbs.value = new Set(brokenThumbs.value).add(thumb)
}

/**
 * 字体卡片的 `font-family`：原版 `family + ",'" + family + "','" + family + " " + weight + "'," + scriptFamily`
 * （`app.v4.js:50970`，逐个照抄，包括那个未加引号的首项）。
 */
function fontFamilyOf(preview: KuFontPreview): string {
  if (!preview.family) return ''
  const { family, weight, scriptFamily } = preview
  return `${family},'${family}','${family} ${weight}',${scriptFamily}`
}

/**
 * 原版 `useColor` 的修饰键路由（`app.v4.js:50128-50163`）：
 * ctrl/meta→形状填充、shift→边框颜色、alt→更改颜色（会回写项）、无→智能填充颜色。
 * 判据不是"能不能做"，而是 `ft.f/g/e`（`:70622-70638`）这三个修饰键。
 */
function modifierOf(event: MouseEvent): StyleModifier {
  if (event.ctrlKey || event.metaKey) return 'ctrl'
  if (event.shiftKey) return 'shift'
  if (event.altKey) return 'alt'
  return 'none'
}

async function applyItem(kind: KuKind, groupIndex: number, itemIndex: number, event: MouseEvent) {
  // alt 应用颜色后 PS 侧可能改写这一项，成功后要重新读库
  const replaced = await applyKind(kind, groupIndex, itemIndex, modifierOf(event))
  if (replaced) await store.load()
}

/**
 * 点项 → 按库分派。四库各一条命令，**没有兜底分支**。
 *
 * 原版四个库的项是四个组件（`DC` / `qC` / `e_` / `o_`），点击处理互不通用：
 * 字体项走 `useFont`（`app.v4.js:51187-51228`），图层样式项走 `:51509-51511`。
 * 落到"最后一个 else"就会把字体项当图层样式应用——这是本页修掉的数据级 bug。
 */
async function applyKind(
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
  modifier: StyleModifier,
): Promise<boolean> {
  switch (kind) {
    case 'color':
      await applyColorCmd.run({ groupIndex, itemIndex, modifier })
      return modifier === 'alt'
    case 'gradient':
      await applyGradientCmd.run({ groupIndex, itemIndex })
      return false
    case 'font':
      // 原版 `useFont`（`:51200-51215`）：先 check 再 use，不改库文件
      await applyFontCmd.run({ groupIndex, itemIndex })
      return false
    case 'style':
      await applyStyleCmd.run({ groupIndex, itemIndex })
      return false
  }
}

/**
 * 组末「+」→ 按库分派。同样没有兜底分支：原版四库各一个 `addColor` / `addGradient` /
 * `addFont`（`:51230-51277`）/ `addStyle`，把字体项写进样式库就是污染用户库文件。
 */
async function addKind(kind: KuKind, groupIndex: number): Promise<boolean> {
  switch (kind) {
    case 'color':
      return addColorCmd.run({ groupIndex }, '已添加前景色')
    case 'gradient':
      return addGradientCmd.run({ groupIndex }, '已添加当前渐变')
    case 'font':
      return addFontCmd.run({ groupIndex }, '已添加当前字体')
    case 'style':
      return addStyleCmd.run({ groupIndex }, '已保存图层样式')
  }
}

async function pickColorToGroup(kind: KuKind, groupIndex: number) {
  const ok = await pickColorToGroupCmd.run({ kind, groupIndex }, '已添加到分组')
  if (ok) await store.load()
}

async function addItem(kind: KuKind, groupIndex: number) {
  if (await addKind(kind, groupIndex)) await store.load()
}

// ---------- 拖拽排序（原版 `am()` 机制，见 `composables/useLongPressDrag`）----------
//
// 原版四库各两处接线，逐库同构（颜色 `:49932-49937` / `:49979-49985`，渐变 `:50515-50520` /
// `:50542-50548`，字体 `:50901-50906` / `:50930-50936`，样式 `:51319-51324` / `:51366-51372`）：
// **组**：组容器的 `mousedown → dragColorWrap`、`mousemove → dragColorWrapDrop`；
// **项**：项的 `mousedown → drag`（先 `stopPropagation`）、`mousemove → drop`。
//
// 落点候选（原版 `classval`）：项是 `.drag-color` / `.drag-gradients` / `.drag-font` / `.drag-style`
// —— 即**同一个库里所有组的项**，所以项可以跨组拖；组是 `.drag-color-wrap` 等，同一库里所有组容器。
// 我们不用原版那些类名，改用 `data-drag-*` 数据集（页面上没有第二个消费者，不需要全局类名）。

const drag = useLongPressDrag()
const pageRoot = ref<HTMLElement | null>(null)
/** 滚动容器：原版组拖拽的 `scrollTopClass = ".Style-vueScroll"`（`:50090`），纵向判定要加它的 `scrollTop` */
const bodyRef = ref<HTMLElement | null>(null)

/** 正在拖的源。组拖拽 `itemIndex = -1`（对应原版 `isTopDrag` 的两种模式） */
type DragSlot = { kind: KuKind; groupIndex: number; itemIndex: number }
let dragSource: DragSlot | null = null
/** 最后落到的候选（原版 `moveEndIndex`） */
let dragTarget: DragSlot | null = null
/**
 * 组拖拽期间被折叠的组 `"<库>-<组下标>"`。
 *
 * 原版 `before()` 把该组 `show=false`（`:50086-50088`），折叠状态最终随 `updata()` 一起落盘。
 * 我们不让它走 `setGroupShow`（那是写库命令，一次拖拽就变成两次写盘），只折叠视图；
 * 落盘由拖动结束那一次 `style.moveGroupTo` 一并完成（repo 里同时把被移动的组置 `show=false`）。
 */
const dragCollapsed = ref('')

function groupKey(kind: KuKind, groupIndex: number): string {
  return `${kind}-${groupIndex}`
}

/** 落点候选：同一库里所有项 / 所有组容器（原版 `classval` 的等价物） */
function targetElements(kind: KuKind, attr: 'item' | 'group'): HTMLElement[] {
  const root = pageRoot.value
  if (!root) return []
  return Array.from(
    root.querySelectorAll<HTMLElement>(`[data-drag-kind="${kind}"][data-drag-${attr}]`),
  )
}

/** 从项的 `data-*` 读回落点 */
function itemSlotOf(element: HTMLElement): { groupIndex: number; itemIndex: number } | null {
  const groupIndex = Number(element.dataset.itemGroup)
  const itemIndex = Number(element.dataset.dragItem)
  if (!Number.isInteger(groupIndex) || !Number.isInteger(itemIndex)) return null
  return { groupIndex, itemIndex }
}

/** 从组容器的 `data-*` 读回落点 */
function groupSlotOf(element: HTMLElement): number | null {
  const groupIndex = Number(element.dataset.dragGroup)
  return Number.isInteger(groupIndex) ? groupIndex : null
}

/**
 * 项拖拽起手（原版 `drag(t, e, n)`，`:50045-50071`）。
 *
 * 原版 `mousedown` 先 `stopPropagation`（render `:49980`）：项的 mousedown 不许冒到组容器上，
 * 否则一次点项会同时起两条拖拽。
 */
function onItemMouseDown(event: MouseEvent, kind: KuKind, groupIndex: number, itemIndex: number) {
  event.stopPropagation()
  dragSource = { kind, groupIndex, itemIndex }
  dragTarget = null

  const started = drag.start({
    event,
    node: event.currentTarget as HTMLElement,
    axis: 'x',
    // 原版样式页的项拖拽**没有** `ml`（`:50050-50070` 只传 classval/Callback）；
    // `ml: -40` 是动作页 `drag` 的（`:56091`），本页照样式页，偏移取 0。
    targets: () => targetElements(kind, 'item'),
    onHover: (element) => {
      const slot = itemSlotOf(element)
      dragTarget = slot ? { kind, ...slot } : null
    },
    onEnd: (result) => void endItemDrag(result),
  })

  if (!started) dragSource = null
}

/** 项拖拽落手：只有真的拖过、且落点换了位置才写盘（原版外层判 `:50053`） */
async function endItemDrag(result: LongPressDragResult) {
  const source = dragSource
  const target = dragTarget
  dragSource = null
  dragTarget = null
  if (!source || !target || !result.dragged) return
  if (source.groupIndex === target.groupIndex && source.itemIndex === target.itemIndex) return

  const ok = await moveItemToCmd.run({
    kind: source.kind,
    fromGroup: source.groupIndex,
    fromIndex: source.itemIndex,
    toGroup: target.groupIndex,
    toIndex: target.itemIndex,
    position: result.position,
  })
  if (ok) await store.load()
}

/**
 * 组拖拽起手（原版 `dragColorWrap(t, e, n)`，`:50077-50114`）。
 *
 * 原版这里自己再判一次 `ft.f()`（`:50079`），因为它在 `$nextTick` 里调 `am()`，
 * 那时全局 `window.event` 已经没了、`am()` 的闸门恒过。我们的闸门就在 `drag.start` 里，判一次够。
 */
function onGroupMouseDown(event: MouseEvent, kind: KuKind, groupIndex: number) {
  dragSource = { kind, groupIndex, itemIndex: -1 }
  dragTarget = null

  const started = drag.start({
    event,
    node: event.currentTarget as HTMLElement,
    axis: 'y',
    scrollRoot: bodyRef.value,
    floatClass: 'style-group--drag',
    targets: () => targetElements(kind, 'group'),
    before: () => {
      dragCollapsed.value = groupKey(kind, groupIndex)
    },
    onHover: (element) => {
      const index = groupSlotOf(element)
      dragTarget = index === null ? null : { kind, groupIndex: index, itemIndex: -1 }
    },
    onEnd: (result) => void endGroupDrag(result),
  })

  if (!started) dragSource = null
}

/** 组拖拽落手：同组 = 原位，不写盘（原版 `if (t != moveEndIndex)`，`:50095`） */
async function endGroupDrag(result: LongPressDragResult) {
  const source = dragSource
  const target = dragTarget
  dragSource = null
  dragTarget = null
  dragCollapsed.value = ''
  if (!source || !target || !result.dragged) return
  if (source.groupIndex === target.groupIndex) return

  const ok = await moveGroupToCmd.run({
    kind: source.kind,
    from: source.groupIndex,
    to: target.groupIndex,
    position: result.position,
  })
  if (ok) await store.load()
}

// ---------- 右键菜单（原版 showItemMenu / showGroupMenu）----------

/**
 * 当前右键目标。`itemIndex >= 0` 是项菜单，`-1` 是分组菜单（原版是两个方法，目标不同）。
 * `x/y` 取 `event.clientX/clientY`：原版 `$menu.show` 用的就是 `pageX/pageY`
 * （`app.v4.js:452-465`），面板不滚动整页，两者等价。
 */
const menu = ref({
  visible: false,
  x: 0,
  y: 0,
  kind: 'color' as KuKind,
  groupIndex: 0,
  itemIndex: -1,
})

/** 原版 `showItemMenu(t, e, n)`（`:50324-50366`）：`contextmenu` 里 preventDefault + stopPropagation */
function openItemMenu(event: MouseEvent, kind: KuKind, groupIndex: number, itemIndex: number) {
  event.preventDefault()
  event.stopPropagation()
  menu.value = { visible: true, x: event.clientX, y: event.clientY, kind, groupIndex, itemIndex }
}

/** 原版 `showGroupMenu(t, e)`（`:50227-50322`）；`BaseGroup` 已经 `.prevent` 过浏览器菜单 */
function openGroupMenu(event: MouseEvent, kind: KuKind, groupIndex: number) {
  menu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    kind,
    groupIndex,
    itemIndex: -1,
  }
}

/** 项重命名的提示语按库分派：原版颜色/渐变 `请输入颜色名称`（`:50336`/`:50804`）、字体 `请输入字体名称`（`:51120`）、样式 `请输入样式名称`（`:51567`） */
const ITEM_NAME_LABEL: Record<KuKind, string> = {
  color: '颜色',
  gradient: '颜色',
  font: '字体',
  style: '样式',
}

/**
 * 分组菜单里两条仓库项：命令未实现（原版 `$emit("sendWarehouse"|"moveWarehouse")`，`:50308-50320` 等）
 * → 渲染但置灰。台账 T-65。
 */
const WAREHOUSE_TITLE = '未实现（T-65）：仓库发送/移动命令还没实现'

/**
 * 「快速吸色到组」走 `style.pickColorToGroup`（T-66）：切吸色工具 → 等吸色完成 → 加到该组。
 * 取消 / 超时由命令抛错、`useCommand` 统一提示。
 */

/**
 * 四库空态文案（T-64 定案）。
 *
 * 原版四库没有空态文案（什么都不显示），所以这四条是自拟的；统一句式：
 * `<库名>还是空的：<这一库存什么>，点组末的 + <怎么加第一项>。`
 * 只描述"该放什么"，不写"暂无数据"这类同义反复。
 */
const EMPTY_LIB_TEXT: Record<KuKind, string> = {
  color: '颜色库还是空的：常用颜色会存在这里，点组末的 + 取当前前景色。',
  gradient: '渐变库还是空的：常用渐变色会存在这里，点组末的 + 取当前渐变。',
  font: '字体库还是空的：常用字体属性会存在这里，点组末的 + 取当前文字图层。',
  style: '样式库还是空的：常用图层样式会存在这里，点组末的 + 保存当前图层样式。',
}

/** 整页空态（可见库全空）：不重复四句，只给一个总入口 */
const EMPTY_PAGE_TEXT = '四个库都还是空的：点各组末尾的 + 添加第一项。'

/**
 * 右键菜单内容：**四库各不相同**，逐库照抄原版顺序与分隔线位置。
 *
 * | 库 | 项菜单 | 分组菜单 |
 * |---|---|---|
 * | 颜色 | 删除 / 重命名 / fg / 发送到色板 / 追加到色板（`:50324-50366`） | 创建新组 / fg / 删除 / 重命名 / fg / 发送到色板 / 追加到色板 / fg / 快速吸色到组 / fg / 发送到仓库… / 移动到仓库…（`:50227-50322`） |
 * | 渐变 | 删除 / 重命名（`:50800-50819`） | 创建新组 / fg / 删除 / 重命名 / fg / 发送到仓库… / 移动到仓库…（`:50821-50871`） |
 * | 字体 | 删除 / 重命名（`:51116-51135`） | 同上 7 行（`:51137-51185`） |
 * | 样式 | 删除 / 重命名（`:51563-51579`） | 同上 7 行（`:51581-51626`） |
 *
 * 只有「创建新组」带图标 `#iconchuangjian`（`:50231` / `:50825` / `:51141` / `:51585`）；
 * `fg` 是分隔线（原版渲染成 `<hr class="menu-hr">`，`:319-320`）。
 */
const menuItems = computed<StyleMenuEntry[]>(() => {
  const { kind, groupIndex, itemIndex } = menu.value

  if (itemIndex >= 0) {
    const shared: StyleMenuEntry[] = [
      { text: '删除', action: () => void requestDeleteItem(kind, groupIndex, itemIndex) },
      { text: '重命名', action: () => openPrompt('renameItem', kind, groupIndex, itemIndex) },
    ]
    // 色板两项只有颜色库有：渐变 / 字体 / 样式三库的项菜单就两行
    if (kind !== 'color') return shared

    return [
      ...shared,
      // 原版这一项是 `text:"fg"`（`:50341`），却挂了一个 `addGroup` 回调——原版 bug，这里只当分隔线
      { text: '', separator: true },
      { text: '发送到色板', action: () => void sendToSwatch(kind, groupIndex, itemIndex) },
      { text: '追加到色板', action: () => void appendItemToSwatch(kind, groupIndex, itemIndex) },
    ]
  }

  const groupHead: StyleMenuEntry[] = [
    {
      text: '创建新组',
      icon: '#iconchuangjian',
      action: () => openPrompt('createGroup', kind, groupIndex),
    },
    { text: '', separator: true },
    { text: '删除', action: () => void requestDeleteGroup(kind, groupIndex) },
    { text: '重命名', action: () => openPrompt('renameGroup', kind, groupIndex) },
    { text: '', separator: true },
  ]
  const warehouseEntries: StyleMenuEntry[] = [
    { text: '发送到仓库...', disabled: true, title: WAREHOUSE_TITLE },
    { text: '移动到仓库...', disabled: true, title: WAREHOUSE_TITLE },
  ]

  // 渐变 / 字体 / 样式三库的分组菜单到「移动到仓库…」为止，共 7 行
  if (kind !== 'color') return [...groupHead, ...warehouseEntries]

  // 颜色库多出「色板两项 + 快速吸色」一段，夹在重命名与仓库项之间（`:50258-50306`）
  return [
    ...groupHead,
    { text: '发送到色板', action: () => void sendGroupToSwatch(kind, groupIndex) },
    { text: '追加到色板', action: () => void appendGroupToSwatch(kind, groupIndex) },
    { text: '', separator: true },
    { text: '快速吸色到组', action: () => void pickColorToGroup(kind, groupIndex) },
    { text: '', separator: true },
    ...warehouseEntries,
  ]
})

// ---------- 弹层：新建组 / 改组名 / 改项名（原版 `$inputBox.show`，`:484-681`）----------

type PromptMode = 'createGroup' | 'renameGroup' | 'renameItem'

const prompt = ref({
  visible: false,
  mode: 'createGroup' as PromptMode,
  title: '新建分组',
  placeholder: '请输入组名',
  value: '',
  kind: 'color' as KuKind,
  groupIndex: 0,
  itemIndex: -1,
})

/**
 * 原版 `$inputBox.show(callback, title, content)`：
 * 新建组不填默认值（`:50234`）、重命名组回填当前组名（`:50256` `getGroupName`）、
 * 重命名项不回填（`:50336`）。
 *
 * `groupIndex = -1` 表示"不是从某一组右键来的"（底栏四个「添加×分组」按钮，
 * 原版 `addGroup(t)` `:54873-54879` 只传库名 → 追加到末尾）。
 */
function openPrompt(mode: PromptMode, kind: KuKind, groupIndex = -1, itemIndex = -1) {
  const group = libraries.value[kind][groupIndex]
  const config: Record<PromptMode, { title: string; placeholder: string; value: string }> = {
    createGroup: { title: '新建分组', placeholder: '请输入组名', value: '' },
    renameGroup: { title: '重命名分组', placeholder: '请输入组名', value: group?.name ?? '' },
    renameItem: {
      title: '重命名',
      placeholder: `请输入${ITEM_NAME_LABEL[kind]}名称`,
      value: '',
    },
  }
  prompt.value = { visible: true, mode, kind, groupIndex, itemIndex, ...config[mode] }
}

async function submitPrompt() {
  // 回车和「确定」都会进来：先关，避免命令跑两遍（CepModal 的 ok 本来也会关）
  prompt.value.visible = false
  const { mode, kind, groupIndex, itemIndex, value } = prompt.value

  const ok =
    mode === 'createGroup'
      ? // 原版 `addGroup(t, e)`：插在右键的那个组之后（`:50235`）；底栏按钮没有"那个组"，追加到末尾
        await addGroupCmd.run(
          { kind, name: value, afterIndex: groupIndex >= 0 ? groupIndex : undefined },
          '已新建分组',
        )
      : mode === 'renameGroup'
        ? await renameGroupCmd.run({ kind, groupIndex, name: value }, '已重命名分组')
        : await renameItemCmd.run({ kind, groupIndex, itemIndex, name: value }, '已重命名')

  if (ok) await store.load()
}

// ---------- 删除（有意偏离：二次确认，原版直接删）----------

async function requestDeleteItem(kind: KuKind, groupIndex: number, itemIndex: number) {
  const name = libraries.value[kind][groupIndex]?.items[itemIndex]?.name ?? ''
  const ok = await confirm.confirm({
    title: '确认删除',
    message: `删除「${name}」？删除后无法恢复。`,
  })
  if (!ok) return
  if (await deleteItemCmd.run({ kind, groupIndex, itemIndex }, '已删除')) await store.load()
}

async function requestDeleteGroup(kind: KuKind, groupIndex: number) {
  const group = libraries.value[kind][groupIndex]
  // `style.deleteGroup` 删空后会自动补一个「<库名>默认分组」（`app.v4.js:52451-52454`），所以没有"第 0 组不可删"
  const ok = await confirm.confirm({
    title: '确认删除',
    message: `删除分组「${group?.name ?? ''}」？组内 ${group?.items.length ?? 0} 项会一起删除。`,
  })
  if (!ok) return
  if (await deleteGroupCmd.run({ kind, groupIndex }, '已删除分组')) await store.load()
}

/** 原版「发送到色板」（`:50349-50355`）：把这一项写成色板全文，随后 tips「追加成功」 */
async function sendToSwatch(kind: KuKind, groupIndex: number, itemIndex: number) {
  await sendToSwatchCmd.run({ kind, groupIndex, itemIndex }, '已发送到色板')
}

/** 原版「追加到色板」（`:50356-50364`）：读回 seBan → push 该项 → 写回 */
async function appendItemToSwatch(kind: KuKind, groupIndex: number, itemIndex: number) {
  await appendItemToSwatchCmd.run({ kind, groupIndex, itemIndex }, '已追加到色板')
}

/** 原版分组「发送到色板」（`:50260-50268`）：该组 `list` 整份替换 seBan（不是追加） */
async function sendGroupToSwatch(kind: KuKind, groupIndex: number) {
  await sendGroupToSwatchCmd.run({ kind, groupIndex }, '已发送到色板')
}

/** 原版分组「追加到色板」（`:50269-50290`）：读回 → 逐项 push 该组 `list` → 写回 */
async function appendGroupToSwatch(kind: KuKind, groupIndex: number) {
  await appendGroupToSwatchCmd.run({ kind, groupIndex }, '已追加到色板')
}

// ---------- 仓库下拉：切换 / 改名 / 删除 / 新建 ----------

/** 原版 `initData`（`:53948-53952`）：清 hover 与编辑态 */
function resetWarehouseEdit() {
  hoverIndex.value = -1
  editingIndex.value = -1
  editValue.value = ''
}

/** 原版 `f_showDown`（`:53953-53962`）：切 `showDown` 后清 hover/编辑态 */
function toggleWarehouse() {
  warehouseOpen.value = !warehouseOpen.value
  resetWarehouseEdit()
}

function closeWarehouse() {
  warehouseOpen.value = false
  resetWarehouseEdit()
}

/** 点空白 / Esc 收起（替代原版的全局 `$store.state.showMenu`，见 `useDismiss`） */
useDismiss(() => warehouseOpen.value, warehouseRoot, closeWarehouse)

/**
 * 原版 `f_select`（`:53963-53967`）：写 `index` → 通知页面 → 关下拉。
 * 页面处理器 `selectWarehouse`（`:55008-55011`）写索引后重读四库（`initData`）。
 */
async function selectWarehouseRow(index: number) {
  const ok = await selectWarehouseCmd.run({ index })
  // 关下拉照原版：无论写成功与否，`f_select` 都会 `showDown = false`
  closeWarehouse()
  if (ok) await store.load()
}

/**
 * 原版 `f_edit`（`:53989-53992`）：再点同一个图标是取消（`showEdit == -1 ? t : -1`）。
 * 提交走回车（`f_editEnd`，`:53993-54002`）。
 */
function startRenameWarehouse(index: number) {
  editingIndex.value = editingIndex.value === index ? -1 : index
  editValue.value = warehouses.value[index]?.name ?? ''
}

async function submitRenameWarehouse() {
  const index = editingIndex.value
  if (index < 0) return

  const name = editValue.value.trim()
  // 有意偏离：原版 `f_editEnd` 不校验空名，空名会让仓库条整行变空白（命令层也会拒）
  if (!name) {
    feedback.warn('仓库名不能为空')
    return
  }

  if (await renameWarehouseCmd.run({ index, name }, '已重命名仓库')) {
    resetWarehouseEdit()
    await store.load()
  }
}

/**
 * 原版 `f_add`（`:53968-53974`）：追加「未命名分组」后**直接进编辑态**。
 * 新仓库的下标要等重读完索引才知道，所以先 `load` 再定位末位。
 */
async function addWarehouseGroup() {
  if (!(await addWarehouseCmd.run())) return
  await store.load()
  const index = warehouses.value.length - 1
  editingIndex.value = index
  editValue.value = warehouses.value[index]?.name ?? ''
}

/**
 * 原版 `f_delete`（`:53976-53988`）：只剩一个时 tips「最少保留一个分组哦」，否则确认后删。
 *
 * **有意偏离**：原版 `wh.delete` 直接删磁盘上的四个库文件与组图片（`:53329-53356`）；
 * 这里改成移进 `<用户目录>/.deleted-<时间戳>/`（可恢复），确认文案也照实说明。
 */
async function requestDeleteWarehouse(index: number) {
  if (warehouses.value.length === 1) {
    feedback.info('最少保留一个分组哦')
    return
  }

  const name = warehouses.value[index]?.name ?? ''
  const ok = await confirm.confirm({
    title: '确认删除',
    message: `删除仓库「${name}」？四个库文件与组图片会移到用户目录下的 .deleted-<时间戳> 文件夹，可手动恢复。`,
  })
  if (!ok) return
  // 下拉不关：原版删完仍停在下拉里（`delWarehouseGroup` 只 `initData`，`:54987-54998`）
  if (await deleteWarehouseCmd.run({ index }, '已删除仓库')) await store.load()
}

onMounted(() => {
  void store.load()
})
</script>

<template>
  <div ref="pageRoot" class="style-page">
    <!-- 原版 warehouse 组件（`app.v4.js:53747-53909`）：行内 16×16 图标 + 蓝色仓库名 + 10×10 箭头，
         点开是仓库列表（索引 `sj_kuStoreInfo.ini`）。整行点击 = 开合下拉（`:53750-53784`）。 -->
    <div ref="warehouseRoot" class="style-warehouse">
      <div class="style-warehouse__row" title="仓库分组，管理样式" @click.stop="toggleWarehouse">
        <Icon name="#iconmorencangku" size="md" />
        <p class="style-warehouse__name">{{ currentName }}</p>
        <Icon name="#iconzhankaizhedie" size="xs" class="style-warehouse__arrow" />
      </div>

      <div v-if="warehouseOpen" class="style-warehouse__down">
        <div class="style-warehouse__down-main">
          <div
            v-for="(warehouse, i) in warehouses"
            :key="i"
            class="style-warehouse__item"
            @mouseenter="hoverIndex = i"
            @mouseleave="hoverIndex = -1"
            @click.stop="selectWarehouseRow(i)"
          >
            <!-- 未选中渲染空 name 占位（原版 `:53808`），这里用 visibility 留出同样的位置 -->
            <Icon
              name="#icongouxuan"
              size="sm"
              class="style-warehouse__check"
              :class="{ 'is-hidden': i !== activeIndex }"
            />
            <!-- 改名：原版 `input.f-space` + `size="3"`，回车提交（`:53823-53854`） -->
            <input
              v-if="editingIndex === i"
              v-model="editValue"
              class="style-warehouse__input"
              type="text"
              size="3"
              @click.stop
              @keyup.enter="submitRenameWarehouse"
            />
            <p v-else class="style-warehouse__item-name">{{ warehouse.name }}</p>
            <!-- 右侧操作区：`v-show="i == showMore"`（`:53855-53885`），图标 15px → 用 14px 预设 -->
            <div v-if="hoverIndex === i" class="style-warehouse__ops">
              <Icon
                name="#iconshuru"
                size="sm"
                title="重命名"
                class="style-warehouse__op"
                @click.stop="startRenameWarehouse(i)"
              />
              <Icon
                name="#iconshanchu"
                size="sm"
                title="删除"
                class="style-warehouse__op"
                @click.stop="requestDeleteWarehouse(i)"
              />
            </div>
          </div>
        </div>

        <!-- 末尾：`<hr>` + 「创建新分组」（`:53886-53909`） -->
        <hr class="style-warehouse__hr" />
        <div class="style-warehouse__item style-warehouse__add" @click.stop="addWarehouseGroup">
          <Icon name="#iconchuangjian" size="sm" class="style-warehouse__check" />
          <p class="style-warehouse__item-name">创建新分组</p>
        </div>
      </div>
    </div>

    <div class="style-tabs">
      <MultiTabs v-model="showTabs" :labels="KU_TAB_LABELS" />
    </div>

    <div id="style-scroll" ref="bodyRef" class="style-body">
      <p v-if="loading" class="style-hint style-loading">正在读取样式库…</p>

      <div v-else-if="error" class="style-error">
        <p class="style-hint style-hint--error">{{ error }}</p>
        <GButton class="style-retry" size="small" @click="store.retry()">重试</GButton>
      </div>

      <EmptyState v-else-if="isEmpty" compact :text="EMPTY_PAGE_TEXT" />

      <template v-else>
        <p v-if="!visibleKinds.length" class="style-hint">
          四个库都已隐藏，ctrl+点击任一标签可显示
        </p>

        <section
          v-for="kind in visibleKinds"
          :key="kind"
          class="style-lib"
          :class="libClass(kind)"
          :title="dragTitle(kind)"
        >
          <EmptyState v-if="!libraries[kind].length" compact :text="EMPTY_LIB_TEXT[kind]" />

          <!-- 组容器：原版 `.app-padding…mb4`（render `:49930` / `:50513` / `:50899` / `:51314`），
               组间距 4px + 左内边距 10px 都挂在这一层，不在 `.style-lib` 上。
               `mousedown` 起组拖拽（原版 `dragColorWrap`，`:49932` 等四处）；项的 `mousedown`
               会先 `stopPropagation`，所以点项不会连带起组拖拽。 -->
          <div
            v-for="(group, index) in libraries[kind]"
            :key="`${kind}-${index}`"
            class="style-group"
            :data-drag-kind="kind"
            :data-drag-group="index"
            :title="groupTitle(kind)"
            @mousedown="onGroupMouseDown($event, kind, index)"
          >
            <BaseGroup
              :text="group.name"
              :value="group.show && dragCollapsed !== groupKey(kind, index)"
              @change="setGroupShow(kind, index, false)"
              @ctrl="setGroupShow(kind, index, true)"
              @menu="openGroupMenu($event, kind, index)"
            >
              <div class="style-items" :title="itemsTitle(kind)">
                <div
                  v-for="(item, itemIndex) in group.items"
                  :key="itemIndex"
                  class="style-item"
                  :class="{
                    'style-item--image': kind === 'gradient' && !!gradientImageSrc(item.image),
                  }"
                  :data-drag-kind="kind"
                  :data-item-group="index"
                  :data-drag-item="itemIndex"
                  @mouseenter="showDescribe($event, kind, index, itemIndex)"
                  @mouseleave="hideDescribe"
                  @mousedown="onItemMouseDown($event, kind, index, itemIndex)"
                  @click="applyItem(kind, index, itemIndex, $event)"
                  @contextmenu.prevent.stop="openItemMenu($event, kind, index, itemIndex)"
                >
                  <!-- 颜色 / 渐变：整块就是色块（原版 .color-block 直接带 backgroundColor / backgroundImage，
                     render `:49960` / `:50564`） -->
                  <template v-if="kind === 'color' || kind === 'gradient'">
                    <img
                      v-if="item.image && gradientImageSrc(item.image)"
                      class="style-item__img"
                      :src="gradientImageSrc(item.image)"
                      :alt="item.name"
                    />
                    <span
                      v-else-if="item.swatch"
                      class="style-item__swatch"
                      :style="{ '--swatch-color': item.swatch }"
                    />
                  </template>

                  <!-- 字体：70×44 卡片 = 字体数 + N点 + 5×5 色点 + 「中文字」（render `:50956-50971`） -->
                  <template v-else-if="kind === 'font' && item.fontPreview">
                    <div class="style-item__font-head">
                      <p class="style-item__font-count">{{ item.fontPreview.count }}</p>
                      <p class="style-item__font-size">{{ item.fontPreview.size }}</p>
                      <span
                        v-if="item.fontPreview.color"
                        class="style-item__font-dot"
                        :style="{ '--dot-color': item.fontPreview.color }"
                      />
                    </div>
                    <p
                      class="style-item__font-sample"
                      :style="{ '--sample-font': fontFamilyOf(item.fontPreview) }"
                    >
                      中文字
                    </p>
                  </template>

                  <!-- 样式：26×26 缩略图 `kuStyle/<id>.png`（render `:51348-51353`）。
                     图挂了（文件不存在 / 没有 id）就不再画 <img>，留 .style-item 那层 rgba(0,0,0,.3) 底。 -->
                  <template v-else-if="kind === 'style'">
                    <img
                      v-if="styleThumbSrc(item.thumb) && !brokenThumbs.has(item.thumb ?? '')"
                      class="style-item__thumb"
                      :src="styleThumbSrc(item.thumb)"
                      :alt="item.name"
                      @error="onThumbError(item.thumb ?? '')"
                    />
                  </template>
                </div>

                <!-- 原版各组末尾的添加入口（如 `app.v4.js:49988-50000`）：底色 #535353、hover #444，
                   图标是 `.icon` 跟 1em（12px）。title 四库原文不同，见 ADD_TITLE -->
                <button
                  class="style-item style-item__add"
                  type="button"
                  :title="ADD_TITLE[kind]"
                  @click="addItem(kind, index)"
                >
                  <Icon name="#iconchuangjian" />
                </button>
              </div>
            </BaseGroup>
          </div>
        </section>
      </template>
    </div>

    <BackTop target="#style-scroll" />

    <!-- 右键菜单浮层（原版 `$menu`，`app.v4.js:278-433`）：项 3 项、分组 5 项，见 menuItems -->
    <StyleMenu v-model:visible="menu.visible" :x="menu.x" :y="menu.y" :items="menuItems" />

    <!-- 项 hover 浮层（T-60）：定位走 `useFloatingPosition`，上方优先 / 贴顶翻转 / 右边界内收 -->
    <div v-if="describeContent" ref="describeRef" class="style-describe">
      <p class="style-describe__name">{{ describeContent.name }}</p>
      <p class="style-describe__meta">{{ describeContent.subtitle }}</p>
      <p v-if="describeContent.detail" class="style-describe__meta">{{ describeContent.detail }}</p>
    </div>

    <!-- 原版 `$inputBox.show` 的重命名输入框；`CepModal` 是项目约定的弹窗外壳 -->
    <CepModal v-model:visible="prompt.visible" :title="prompt.title" @ok="submitPrompt">
      <GInput v-model="prompt.value" :placeholder="prompt.placeholder" @enter="submitPrompt" />
    </CepModal>

    <!-- 原版 .button-nav（`app.v4.js:49773-49832`）：添加分组 4 个 + 竖线 + 导入 / 导出。
         四个「添加×分组」= `addGroup("col"|"gradient"|"font"|"style")`（`:54873-54879`，弹输入框、追加到末尾）；
         导入 / 导出是**两个按钮各弹菜单**（契约 §3.5），不是四个按钮；
         菜单项与 `commands/style.ts` 第 6 段的 4 条 `.kux` 命令一一对应。
         图标不带 size：原版本页是 `.svg-18`（清单 #93），但底排图标守卫要求全项目 1em
         （`tests/components/page-bottom-bar.test.ts:155`），本页跟着守卫走，18px 待统一决定。 -->
    <PageBottomBar>
      <button
        class="g-bottom-bar__icon"
        type="button"
        title="添加颜色分组"
        @click="openPrompt('createGroup', 'color')"
      >
        <Icon name="#iconchuangjian" />
      </button>
      <button
        class="g-bottom-bar__icon"
        type="button"
        title="添加渐变分组"
        @click="openPrompt('createGroup', 'gradient')"
      >
        <Icon name="#iconchuangjian" />
      </button>
      <button
        class="g-bottom-bar__icon"
        type="button"
        title="添加字体分组"
        @click="openPrompt('createGroup', 'font')"
      >
        <Icon name="#iconzitimianban" />
      </button>
      <button
        class="g-bottom-bar__icon"
        type="button"
        title="添加样式分组"
        @click="openPrompt('createGroup', 'style')"
      >
        <Icon name="#iconxinjianyangshifenzu" />
      </button>
      <span class="g-bottom-bar__divider" />
      <GDropdown v-model:visible="importMenu" placement="top-start">
        <template #trigger>
          <button class="g-bottom-bar__icon" type="button" title="导入">
            <Icon name="#icondaoru" />
          </button>
        </template>
        <ul class="style-io-menu">
          <li>
            <button type="button" @click="importArchive(false)">导入预设仓库（覆盖）…</button>
          </li>
          <li><button type="button" @click="importArchive(true)">追加预设仓库…</button></li>
        </ul>
      </GDropdown>

      <GDropdown v-model:visible="exportMenu" placement="top-start">
        <template #trigger>
          <button class="g-bottom-bar__icon" type="button" title="导出">
            <Icon name="#icondaochu" />
          </button>
        </template>
        <ul class="style-io-menu">
          <li><button type="button" @click="exportArchive(false)">导出所有仓库…</button></li>
          <li><button type="button" @click="exportArchive(true)">导出当前仓库…</button></li>
        </ul>
      </GDropdown>
    </PageBottomBar>
  </div>
</template>

<style scoped src="./index.css"></style>
