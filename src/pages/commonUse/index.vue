<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import EmptyState from '@/components/EmptyState.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import Icon from '@/components/Icon.vue'
import NewSpin from '@/components/NewSpin.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import { useCommand } from '@/components/command/useCommand'
import { useLongPressDrag } from '@/composables/useLongPressDrag'
import { leftClickOf } from '@/domain/common-use-dispatch'
import { useFeedbackStore } from '@/stores/feedback'
import { useFreePanelStore } from '@/stores/free-panel'
import {
  ENLARGE_ALL_PRESETS,
  ENLARGE_PRESETS,
  FLIP_DIRECTIONS,
  NARROW_ALL_PRESETS,
  NARROW_PRESETS,
  type CommonUseTile,
  type FlipDirection,
} from '@/domain/common-use'
import { useCommonUseStore } from '@/stores/common-use'
import PanelCustomChange from './components/PanelCustomChange.vue'
import PanelEmbed from './components/PanelEmbed.vue'
import PanelExport from './components/PanelExport.vue'
import PanelImport from './components/PanelImport.vue'
import PanelOptimization from './components/PanelOptimization.vue'
import PanelReference from './components/PanelReference.vue'
import PanelSpacing from './components/PanelSpacing.vue'
import UseGridItem from './components/UseGridItem.vue'

/**
 * 常用页（原版 `CommonUse`，render `cp()` app.v4.js:35422）。
 *
 * T-88a 范围：外壳 + 网格区（放大/缩小两行、翻转 6 颗、14 个功能格）。
 * 7 个子面板、拖拽、折叠接线在后续刀里；本刀网格点击只做高亮，不发命令。
 *
 * 页面只读 `stores/common-use.ts` 的投影，写全部走 `useCommand('commonUse.*')`。
 * 本页**没有标题栏 / 页头 / 底栏**（官方 `.CommonUse` 直接是滚动容器，`:35427`），
 * 所以不套 `PageShell`（依据 `PageShell.vue:21` header 是 v-if、`:104` body overflow:hidden）。
 */

const store = useCommonUseStore()
const { tiles, collapsed, options, loading, error, degraded } = storeToRefs(store)

/**
 * 两块区域的显隐 = `sj_set.json` 的 `cyShowZoom` / `cyShowTransformation`。
 * 官方默认都是 true（`:65813`/`:65814`），所以**文件里缺键 = 显示**，只有显式 `false` 才隐藏。
 * 开关在 /set「常用功能面板」（官方 `:61445-61449`/`:61454-61458`）。
 */
const showZoom = computed(() => options.value.cyShowZoom !== false)
const showTransformation = computed(() => options.value.cyShowTransformation !== false)

/**
 * 格子图标要读的两个设置项（官方 render 直接读 `t.set.*`，`:35695` / `:35704`）。
 * `cyExport.ext` 缺键按 `JPG`（`:65796`）、`cyAutoFillColor` 缺键按开（`:65784`）——
 * 投影不补默认值，所以这里只把显式 `false` 当关，其余判断在 `domain/common-use.ts` 的 `resolveTileIcon`。
 */
const exportExt = computed(
  () => (options.value.cyExport as Record<string, unknown> | undefined)?.ext,
)
const autoFillColor = computed(() => options.value.cyAutoFillColor !== false)

const zoomCmd = useCommand('commonUse.zoom')
/**
 * 放大 / 缩小两行的本地状态（官方同样是组件本地：`enlargeVal:""`/`enlargeIstrue:false`，`:37551-37557`）。
 * 互斥由两个 toggle 保证（官方 `enlargeOpen`/`narrowOpen` 互置 false，`:38163-38170`）。
 */
const enlargeVal = ref('')
const narrowVal = ref('')
const enlargeOpen = ref(false)
const narrowOpen = ref(false)
function toggleEnlarge() {
  enlargeOpen.value = !enlargeOpen.value
  narrowOpen.value = false
}
function toggleNarrow() {
  narrowOpen.value = !narrowOpen.value
  enlargeOpen.value = false
}
/**
 * 回车执行：官方 `inputSize()` 先 `t.replace(/[^\d]/g,"")` 再 `changeSize`（`cy_zoom([t])`，`:38128-38144`）。
 * **有意偏离**：官方对空值不做拦截、会把空串发给 jsx；我方命令层要求"倍数必须是正数"，所以空值不发。
 */
function inputSize(kind: 'enlarge' | 'narrow') {
  const raw = kind === 'enlarge' ? enlargeVal.value : narrowVal.value
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return
  void zoom(Number(digits))
}
const flipCmd = useCommand('commonUse.flip')
const setCollapsedCmd = useCommand('commonUse.setCollapsed')
const addToPanelCmd = useCommand('freePanel.add')
const correctBlurCmd = useCommand('commonUse.correctBlur')
const layerReplaceCmd = useCommand('commonUse.layerReplace')
const locationTradeCmd = useCommand('commonUse.locationTrade')
const exchangeLayerColorCmd = useCommand('commonUse.exchangeLayerColor')
const embedImageCmd = useCommand('commonUse.embedImage')
const embedMultiCmd = useCommand('commonUse.embedMultipleImages')
const importMultiCmd = useCommand('commonUse.importMultipleImages')
const optimizeOnceCmd = useCommand('commonUse.optimizeOnce')
const exportImagesCmd = useCommand('commonUse.exportImages')
const swapWireframeCmd = useCommand('commonUse.swapWireframeFill')
const setOptionCmd = useCommand('commonUse.setOption')
const moveCmd = useCommand('commonUse.move')
const watchPlaceCmd = useCommand('commonUse.watchPlaceImage')
const drag = useLongPressDrag()
const feedback = useFeedbackStore()
const freePanel = useFreePanelStore()

/**
 * 官方 6 向翻转的图标与提示（`app.v4.js:37567-37591`，18×18，`.svg-18` CSS 位置见规格 35620）。
 * **方向文本只从 `domain/common-use.ts` 的 `FLIP_DIRECTIONS` 来**（命令层校验用的也是这一份），
 * 这里只补"图标 + 悬停标题"这层表现信息。
 */
const FLIP_ICONS: Record<string, { svg: string; title: string }> = {
  左右: { svg: '#iconzuoyoufanzhuan', title: '左右翻转' },
  上下: { svg: '#iconshangxiafanzhuan', title: '上下翻转' },
  左: { svg: '#iconxiangzuofanzhuan', title: '向左翻转' },
  右: { svg: '#iconxiangyoufanzhuan', title: '向右翻转' },
  下: { svg: '#iconxiangxiafanzhuan', title: '向下翻转' },
  上: { svg: '#iconxiangshangfanzhuan', title: '向上翻转' },
}

const flipItems = FLIP_DIRECTIONS.map((text) => ({ text, ...FLIP_ICONS[text] }))

/** 展开态高亮（官方 `openfun`，`:38193`）：面板本身在 T-88b 才做 */

/** 官方每行 3 个：`open()` 里 `Math.floor(i/3)` 与 `splice(n*3+3, …)`（`app.v4.js:38201`、`:38209`） */
const GRID_COLUMNS = 3

/** 每行 3 格；面板插在该格所在行的**下一行行首**（官方 `splice(n*3+3, 0, {created})`，`:38209`） */
/**
 * 格子右键 = 加入自由面板（官方 `fpFunction`，`app.v4.js:37657`）。
 *
 * 官方三条分支（`:37674` 的 name→key 表）：自动填充颜色 →「不支持添加自定义面板」(`:37698`)；
 * 自定义变换 / 参考线工具 / 按间距分布 →「请添加展开后的功能」(`:37700`)；其余按 key 加进自由面板。
 */
const PANEL_KEYS: Record<string, string> = {
  嵌入图片: 'cy_embedImage',
  嵌入多图片: 'cy_embedMultipleImage',
  导入多图片: 'cy_importMultipleImage',
  修正模糊: 'cy_coorectBlur',
  填充线框互换: 'cy_swapWireframeFill',
  优化文档: 'cy_optimizeDoc',
  导出图片: 'cy_exportImage',
  元素替换: 'cy_layerReplace',
  位置对换: 'cy_locationTrade',
  图层颜色互换: 'cy_exchangeLayerColor',
}

function onGridContextMenu(tile: CommonUseTile) {
  if (tile.name === '自动填充颜色') {
    feedback.warn('不支持添加自定义面板')
    return
  }
  if (tile.comName) {
    feedback.warn('请添加展开后的功能')
    return
  }
  const key = PANEL_KEYS[tile.name]
  const blockId = freePanel.blocks[0]?.id
  // 官方 `$freePanelBox.show(...)` 会让人选区域；我们没有那个弹层（D-45）
  if (!key || blockId === undefined) {
    feedback.warn('自由面板还没有可添加的区域')
    return
  }
  void addToPanelCmd.run({
    blockId,
    items: [{ text: tile.name, key, icon: tile.icon.rest.replace(/^#/, '') }],
  })
}
const gridRows = computed(() => {
  const rows: CommonUseTile[][] = []
  // 只排显示项：isShow:false 的项在设置页管，不进网格（官方 showContext 过滤 isShow，:37595-37599）
  for (const tile of tiles.value.filter((item) => item.visible)) {
    const last = rows[rows.length - 1]
    if (!last || last.length === GRID_COLUMNS) rows.push([tile])
    else last.push(tile)
  }
  return rows
})

/** 展开面板：`comName` → 子组件（官方 `openfun` 保证同时只开一个，`:38193`） */
const PANELS: Record<string, unknown> = {
  comembed: PanelEmbed,
  comimport: PanelImport,
  comoptimization: PanelOptimization,
  comcustomChange: PanelCustomChange,
  comexport: PanelExport,
  comreference: PanelReference,
  comspacing: PanelSpacing,
}

const expandedId = ref('')
const gridRef = ref<HTMLElement | null>(null)

/** 该行要显示的面板（该行有格子处于展开态且有 `comName`） */
function panelOfRow(row: CommonUseTile[]) {
  const tile = row.find((item) => item.id === expandedId.value)
  return tile?.comName ? PANELS[tile.comName] : undefined
}

/**
 * 左键执行器：**命令 id → 实参构造**。命令 id 全部来自 `LEFT_CLICK_BY_NAME`（官方分派表的镜像），
 * 这里只负责"这条命令要什么参数"，不再判断"哪一格该干什么"（那是 domain 表的事）。
 *
 * 参数来源：面板写进 `sj_set.json` 的值（`options` 投影）。`bLink2` / `bDelete` 是**原值直传**：
 * 官方 `dragInImage()` 就是 `{path:"", bLink2: cyLinkObject, bDelete: cyDeleteNext}`（`app.v4.js:37751-37755`）。
 */
const COMMAND_RUNNERS: Record<string, () => Promise<boolean>> = {
  'commonUse.embedImage': () =>
    embedImageCmd.run({
      options: {
        path: '',
        bLink2: options.value.cyLinkObject,
        bDelete: options.value.cyDeleteNext,
      },
    }),
  'commonUse.embedMultipleImages': () => embedMultiCmd.run(),
  'commonUse.importMultipleImages': () =>
    importMultiCmd.run({ toLinkObject: options.value.cyImportToLinkObject }),
  'commonUse.optimizeOnce': () =>
    optimizeOnceCmd.run({
      options: {
        optimizeAll: Boolean(options.value.cyOptimizeAll),
        deleteAllEmpty: Boolean(options.value.cyOptimizeDeleteAllEmpty),
        deleteAllHide: Boolean(options.value.cyOptimizeDeleteAllHide),
      },
    }),
  'commonUse.exportImages': () =>
    exportImagesCmd.run({
      mode: 'image',
      options: { ...(options.value.cyExport as Record<string, unknown> | undefined) },
    }),
  'commonUse.correctBlur': () => correctBlurCmd.run(),
  'commonUse.swapWireframeFill': () => swapWireframeCmd.run(),
  'commonUse.layerReplace': () => layerReplaceCmd.run(),
  'commonUse.locationTrade': () => locationTradeCmd.run(),
  'commonUse.exchangeLayerColor': () => exchangeLayerColorCmd.run(),
}

/**
 * 长按拖拽排序：闸门 = 按住 ctrl/meta（官方 `am()` 的 `ft.f()`，`:37418`；`useLongPressDrag` 内部同判）。
 * 落点候选 = 全部功能格节点（`data-drop-idx` = `toTiles` 的落盘下标）；轴 `x` 与 `/style` 的项拖拽一致。
 */
function onGridMouseDown(event: MouseEvent) {
  const grid = gridRef.value
  const node = event.currentTarget as HTMLElement | null
  if (!grid || !node) return
  // 拖起时的落盘下标**当场取**：`event.currentTarget` 只在派发期间有效，mouseup 时已是 null
  const from = Number(node.dataset.dropIdx)
  drag.start({
    event,
    node,
    targets: () => Array.from(grid.querySelectorAll('[data-drop-idx]')) as HTMLElement[],
    axis: 'x',
    onEnd(result) {
      // 没真的拖起来（300ms 内抬起）= 官方按普通点击处理，什么都不能改
      if (!result.dragged || !result.target) return
      const to = Number(result.target.dataset.dropIdx)
      // 落到自己 = 原版 `t != moveEndIndex` 判等（`app.v4.js:50053`），不写盘
      if (!Number.isInteger(from) || !Number.isInteger(to) || to === from) return
      void moveCmd.run({ from, to, position: result.position })
    },
  })
}
/**
 * 展开/收起一格的面板 = 官方 `open(e)`（`app.v4.js:38192-38213` 的 `openfun` 再点收起）。
 * 两个入口都调它：左键（仅 3 格，case 22 `:37923`）与**图标块右键**（`:35682-35683`）。
 */
function expandTile(tile: CommonUseTile) {
  const open = expandedId.value !== tile.id
  expandedId.value = open ? tile.id : ''
  void setCollapsedCmd.run({ id: tile.id, collapsed: !open })
}

/**
 * 左键：**只查官方分派表**（`domain/common-use-dispatch.ts`，表来自 `app.v4.js:37894`）。
 * 四种动作：执行命令 / 翻转设置 / 展开面板 / 什么都不做——不在这里写"有子面板就展开"。
 */
function toggle(tile: CommonUseTile) {
  const action = leftClickOf(tile.name)
  if (action.kind === 'none') return

  if (action.kind === 'expand') {
    // 官方 `open(e)`（`:37923`）：只有"自定义变换 / 参考线工具 / 按间距分布"三格走这里
    expandTile(tile)
    return
  }

  if (action.kind === 'toggle-setting') {
    // 官方 case 13（`:37910-37911`）：翻转设置 + 一句提示，**不展开面板**
    const next = !options.value[action.path]
    void setOptionCmd.run({ path: action.path, value: next })
    feedback.ok(next ? '开启智能填色' : '已关闭')
    return
  }

  const runner = COMMAND_RUNNERS[action.command]
  if (runner) void runner()
}

const ready = computed(() => !loading.value && !error.value)

onMounted(async () => {
  await store.load()
  await store.loadOptions()
  store.loadCollapsed()
  // 置入图片的宿主事件监听（官方 mounted 里按开关注册，:37606-37615）
  void watchPlaceCmd.run()
  // 缺省收起；文件里显式记过 `collapsed:false` 的那一格恢复展开（同时只开一个，取第一个）
  const open = tiles.value.find((tile) => tile.comName && collapsed.value[tile.id] === false)
  expandedId.value = open?.id ?? ''
})

function zoom(scale: number) {
  void zoomCmd.run({ scale })
}

function flip(direction: FlipDirection) {
  void flipCmd.run({ direction })
}
</script>

<template>
  <section class="page-common-use u-scroll">
    <p v-if="degraded" class="page-common-use__warn">{{ degraded }}，常用项或设置可能不完整</p>

    <p v-if="error" class="page-common-use__error">
      {{ error }}
      <GButton size="small" type="text" @click="store.load()">重试</GButton>
    </p>

    <div v-if="loading" class="page-common-use__loading">
      <NewSpin tip="正在读取常用项…" />
    </div>

    <template v-else-if="ready">
      <!-- 放大行 / 缩小行：左胶囊 + 4 颗 25% 预设（官方 `.partBtn-wrap` + `.btn-small-4`，`:35485-35489`） -->
      <!-- 放大 / 缩小两行：官方 `baseInput`（可键入、回车执行）+ 右侧展开箭头 + 4 颗预设（`:35430-35499`）；
           箭头展开第二排 10 颗整体档位（`enlargeAll`/`narrowAll`，`v-show` `:35500`/`:35522`）；两行互斥（`:38163-38170`）。
           整块由 `set.cyShowZoom` 控制（`:35430`、`:35522` 两处三元分支）。 -->
      <template v-if="showZoom">
        <SettingsRow class="page-common-use__row">
          <span class="page-common-use__label">放大</span>
          <GInput
            v-model="enlargeVal"
            size="small"
            class="page-common-use__size"
            aria-label="放大倍数"
            @enter="inputSize('enlarge')"
          />
          <GButton size="small" type="text" aria-label="展开放大档位" @click="toggleEnlarge">
            <Icon name="#iconzhankaizhedie" size="xs" />
          </GButton>
          <GButton
            v-for="scale in ENLARGE_PRESETS"
            :key="scale"
            size="small"
            width="quarter"
            @click="zoom(scale)"
          >
            {{ scale }}
          </GButton>
        </SettingsRow>
        <div v-show="enlargeOpen" class="page-common-use__zoom-all">
          <GButton
            v-for="scale in ENLARGE_ALL_PRESETS"
            :key="scale"
            size="small"
            @click="zoom(scale)"
          >
            {{ scale }}
          </GButton>
        </div>

        <SettingsRow class="page-common-use__row">
          <span class="page-common-use__label">缩小</span>
          <GInput
            v-model="narrowVal"
            size="small"
            class="page-common-use__size"
            aria-label="缩小倍数"
            @enter="inputSize('narrow')"
          />
          <GButton size="small" type="text" aria-label="展开缩小档位" @click="toggleNarrow">
            <Icon name="#iconzhankaizhedie" size="xs" />
          </GButton>
          <GButton
            v-for="scale in NARROW_PRESETS"
            :key="scale"
            size="small"
            width="quarter"
            @click="zoom(scale)"
          >
            {{ scale }}
          </GButton>
        </SettingsRow>
        <div v-show="narrowOpen" class="page-common-use__zoom-all">
          <GButton
            v-for="scale in NARROW_ALL_PRESETS"
            :key="scale"
            size="small"
            @click="zoom(scale)"
          >
            {{ scale }}
          </GButton>
        </div>
      </template>

      <!-- 翻转 6 颗：图标按钮，18px（官方 `baseIcon svgWidth:18px`，`:35617-35621`）。
           整块由 `set.cyShowTransformation` 控制（`:35614`）。 -->
      <div v-if="showTransformation" class="page-common-use__flip">
        <GButton
          v-for="item in flipItems"
          :key="item.text"
          size="small"
          type="text"
          :title="item.title"
          :aria-label="item.title"
          @click="flip(item.text)"
        >
          <Icon :name="item.svg" size="lg" />
        </GButton>
      </div>

      <!-- 分隔线只在两块里至少一块显示时才出（官方 `cyShowTransformation || cyShowZoom ? <hr>`，`:35633`） -->
      <hr v-if="showZoom || showTransformation" class="page-common-use__rule" />

      <!-- 功能格：顺序来自 sj_commonFunction.json（页面不写任何 id 字面量）；每行 3 个 -->
      <div ref="gridRef" v-if="tiles.length" class="page-common-use__grid">
        <template v-for="(row, rowIndex) in gridRows" :key="rowIndex">
          <div class="page-common-use__grid-row">
            <UseGridItem
              v-for="tile in row"
              :key="tile.id"
              :tile="tile"
              :expanded="expandedId === tile.id"
              :export-ext="exportExt"
              :auto-fill-color="autoFillColor"
              @click="toggle(tile)"
              @contextmenu="onGridContextMenu(tile)"
              @icon-contextmenu="expandTile(tile)"
              @mousedown="onGridMouseDown($event)"
            />
            <span
              v-for="pad in GRID_COLUMNS - row.length"
              :key="pad"
              class="page-common-use__pad"
            />
          </div>
          <div v-if="panelOfRow(row)" class="page-common-use__panel">
            <component :is="panelOfRow(row)" />
          </div>
        </template>
      </div>
      <EmptyState v-else compact text="还没有常用功能" />
    </template>
  </section>
</template>

<style scoped>
.page-common-use {
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: var(--sp-5) 0 0;
}

/* 行距：官方 `.theme-mt` 8px / `.theme-mt-row` 12px（CSS 位置见规格 35523 / 35615） */
.page-common-use__row + .page-common-use__row,
.page-common-use__row + .page-common-use__flip,
.page-common-use__flip + .page-common-use__rule,
/* 只显示放大/缩小、不显示翻转时，分隔线的上一个兄弟是第二排档位块 */
.page-common-use__zoom-all + .page-common-use__rule {
  margin-top: var(--sp-4);
}

.page-common-use__flip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 var(--sp-5);
}

.page-common-use__rule {
  height: 1px;
  border: none;
  background: var(--c-divider);
}

/* 每行 3 个（官方 `Math.floor(i/3)`，`:38201`；格宽 `.context-one-wrap` 33%，CSS 位置 110803） */
.page-common-use__grid {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.page-common-use__grid-row {
  display: flex;
  align-items: flex-start;
}

.page-common-use__pad {
  width: 33.33%;
}

/* 面板整体占满一行（官方 `.created{width:100%;height:auto}`，CSS 字符位置 111234） */
.page-common-use__panel {
  width: 100%;
  padding: 0 var(--sp-5);
}

.page-common-use__warn,
.page-common-use__error {
  padding: 0 var(--sp-5) var(--sp-3);
  font-size: var(--fs-md);
}

.page-common-use__warn {
  color: var(--warn);
}

.page-common-use__error {
  color: var(--c-danger);
}

.page-common-use__loading {
  display: flex;
  justify-content: center;
  padding: var(--sp-6) 0;
}
</style>
