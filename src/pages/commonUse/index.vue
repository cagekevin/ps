<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CepModal from '@/components/CepModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import GTile from '@/components/GTile.vue'
import Icon from '@/components/Icon.vue'
import PageShell from '@/components/PageShell.vue'
import { useCommand } from '@/components/command/useCommand'
import { useFreePanelAdd } from '@/composables/useFreePanelAdd'
import { useLongPressDrag, type LongPressDragResult } from '@/composables/useLongPressDrag'
import { usePersistedRef } from '@/composables/usePersisted'
import { useFeedbackStore } from '@/stores/feedback'
import { useFreePanelStore } from '@/stores/free-panel'
import FreePanelBlock from '@/pages/freePanel/components/FreePanelBlock.vue'
import FreePanelRegionPicker from '@/pages/freePanel/components/FreePanelRegionPicker.vue'
import ComEmbed from './components/ComEmbed.vue'
import ComExport from './components/ComExport.vue'
import ComImport from './components/ComImport.vue'
import ComOptimization from './components/ComOptimization.vue'
import ComReference from './components/ComReference.vue'
import ComSpacing from './components/ComSpacing.vue'
import CustomChange from './components/CustomChange.vue'
import {
  COMMON_TILES,
  ENLARGE_ALL_PRESETS,
  ENLARGE_PRESETS,
  FLIP_ITEMS,
  NARROW_ALL_PRESETS,
  NARROW_PRESETS,
  type CommonTile,
  type SubPanelKey,
} from './types'

/**
 * 常用页（`/commonUse`）。
 *
 * 结构依据 `docs/生成/页面规格/05-常用.md`（8 个 render）与
 * `docs/组件库/页面契约.md` §9 的 ASCII。
 *
 * C-1：能力全在命令层，父网格与 7 个子面板都只调命令。
 * C-2：子面板复用自由面板（`FreePanelRegionPicker` + `freePanel.*` + `sj_appFreePanel.json`）——
 *      常用页与独立面板共用同一份数据。
 * C-5：按钮宽度用 `GButton` 的官方四档变体，页面不自己算宽度。
 * C-6：网格项用 `GTile`（32×32 圆角块），不套 `ActionGrid`。
 */
const feedback = useFeedbackStore()
const zoomCmd = useCommand('commonUse.zoom')
const flipCmd = useCommand('commonUse.flip')
const embedCmd = useCommand('commonUse.embedImage')
const importCmd = useCommand('commonUse.importMultipleImages')
const optimizeCmd = useCommand('commonUse.optimizeDoc')
const transformCmd = useCommand('commonUse.transform')
const referenceCmd = useCommand('commonUse.referenceLines')
const distributeCmd = useCommand('commonUse.distribute')
const exportCmd = useCommand('commonUse.exportImages')
const openFolderCmd = useCommand('commonUse.openExportFolder')
const freePanelExecuteCmd = useCommand('freePanel.execute')

const freePanelStore = useFreePanelStore()
const {
  visible: freePanelVisible,
  title: freePanelTitle,
  blocks: freePanelBlocks,
  open: openFreePanelPicker,
  confirm: confirmFreePanel,
} = useFreePanelAdd()

/** 放大 / 缩小的输入值（原版 `.inputcom1`，语义未提取，见契约 §9「未提取项」） */
const zoomValue = usePersistedRef('commonUse.zoomValue', '100')
const enlargeOpen = usePersistedRef('commonUse.enlargeOpen', false)
const narrowOpen = usePersistedRef('commonUse.narrowOpen', false)

/** 网格项顺序（拖拽后落盘；原版持久化键未提取，这里自己定一个） */
const tileOrder = usePersistedRef<string[]>('commonUse.tileOrder', [])
/** 当前展开的子面板；`null` = 都收起 */
const expanded = ref<SubPanelKey | null>(null)
/** 批量 PSD 导出确认（原版「文件夹内超过 30 个」弹确认，`docs/页面/05-常用.md:61`） */
const psdConfirm = ref(false)

const embedState = ref({
  autoEmbedOnDrop: false,
  autoEmbedOnPaste: false,
  autoEmbedOnClipboardMask: false,
  linkMode: 'none' as 'none' | 'original' | 'sameFolder',
  deleteNextLayer: false,
  linkSmartObject: false,
})
const importState = ref({ linkSmartObject: false })
const optimizeState = ref({ optimizeAll: true, deleteAllEmpty: false, deleteAllHide: false })
const changeState = ref({
  number: '1',
  angle: '0',
  leftRigth: '0px',
  topBottom: '0px',
  pointIndex: 0,
  scale: '100',
  opacity: '0',
})
const exportState = ref({
  format: 0,
  quality: '100',
  pngDepth: 0,
  saveTo: 'desktop' as 'desktop' | 'folder',
  folder: '',
  name: '',
  useLayerName: false,
  autoNumber: false,
  exportMode: 'web' as 'web' | 'saveAs',
  sliceWidth: '',
  sliceHeight: '',
  alsoOriginal: false,
  autoOpenFolder: false,
})
const referenceState = ref({ smartGuides: false, width: '' })
const spacingState = ref({ width: '10', mode: 'layer' as 'layer' | 'coord' })

const tiles = computed<CommonTile[]>(() => {
  const map = new Map(COMMON_TILES.map((tile) => [tile.key, tile]))
  const ordered = tileOrder.value
    .map((key) => map.get(key))
    .filter((tile): tile is CommonTile => Boolean(tile))
  const rest = COMMON_TILES.filter((tile) => !ordered.some((item) => item.key === tile.key))
  return [...ordered, ...rest]
})

const expandedTitle = computed(
  () => COMMON_TILES.find((tile) => tile.expand === expanded.value)?.text ?? '',
)

/**
 * 展开 / 收起两组预设行。
 *
 * 用显式函数而不是模板里直接 `enlargeOpen = !enlargeOpen`：
 * `usePersistedRef` 返回的是 `Ref`，模板里对 setup 绑定的直接赋值
 * 走 `_ctx` 代理，行为不确定（实测点不动）。显式函数写 `.value` 才是确定的。
 */
function toggleEnlarge() {
  enlargeOpen.value = !enlargeOpen.value
}

function toggleNarrow() {
  narrowOpen.value = !narrowOpen.value
}

function toggleExpand(key: SubPanelKey) {
  expanded.value = expanded.value === key ? null : key
}

// ---------- 缩放 / 翻转 ----------

async function applyZoom(scale: number) {
  await zoomCmd.run({ scale }, `已缩放 ${scale}%`)
}

async function applyCustomZoom() {
  const value = Number(zoomValue.value)
  if (!Number.isFinite(value) || value <= 0) {
    feedback.error('倍数必须是正数')
    return
  }
  await applyZoom(value)
}

async function applyFlip(direction: '左右' | '上下' | '左' | '右' | '下' | '上') {
  await flipCmd.run({ direction }, '已翻转')
}

// ---------- 子面板动作 ----------

async function runEmbed() {
  await embedCmd.run({ options: { ...embedState.value } }, '已嵌入')
}

async function runImport() {
  // 原版「导入多图片」从 PS 抓拖入的图片（`docs/页面/05-常用.md:72`）。
  // 拖入路径由 PS 侧事件带来，页面拿不到；命令层对空路径明确报错，不静默成功。
  await importCmd.run({ paths: [] }, '已导入多图片')
}

async function runOptimize() {
  await optimizeCmd.run({ options: { ...optimizeState.value } }, '已优化文档')
}

function resetChange() {
  changeState.value = {
    number: '1',
    angle: '0',
    leftRigth: '0px',
    topBottom: '0px',
    pointIndex: 0,
    scale: '100',
    opacity: '0',
  }
}

async function runTransform() {
  const number = Number(changeState.value.number)
  const scale = Number(changeState.value.scale)
  const opacity = Number(changeState.value.opacity)

  // 前置校验（AGENTS 硬规则第 4 条：前置校验才直接 feedback.error）
  if (!Number.isFinite(number) || number < 1) {
    feedback.error('要复制的个数不能小于 1')
    return
  }
  if (!Number.isFinite(scale) || scale <= 0 || scale > 9999) {
    feedback.error('比例不能小于或等于 0，也不能大于 9999')
    return
  }
  if (!Number.isFinite(opacity) || opacity > 99) {
    feedback.error('透明度不能大于 99')
    return
  }

  await transformCmd.run(
    {
      params: [
        number,
        Number(changeState.value.angle) || 0,
        changeState.value.leftRigth,
        changeState.value.topBottom,
        changeState.value.pointIndex,
        scale,
        opacity,
      ],
    },
    '已生成变换',
  )
}

async function runReference(action: 'toggle' | 'clear' | 'slice' | 'safeArea') {
  await referenceCmd.run({ action, options: { width: referenceState.value.width } }, '已完成')
}

async function runDistribute() {
  const width = Number(spacingState.value.width)
  if (!Number.isFinite(width)) {
    feedback.error('请输入要分布的间距')
    return
  }
  await distributeCmd.run(
    { params: [0, width, spacingState.value.mode === 'layer' ? 1 : 2] },
    '已分布',
  )
}

async function runExport(mode: 'image' | 'first' | 'second' | 'psd') {
  // 批量 PSD 要先确认（原版「文件夹内超过 30 个」弹确认，`docs/页面/05-常用.md:61`）
  if (mode === 'psd') {
    askPsdExport()
    return
  }
  await exportCmd.run({ mode, options: exportState.value }, '已导出')
}

function askPsdExport() {
  psdConfirm.value = true
}

async function confirmPsdExport() {
  await exportCmd.run({ mode: 'image', options: exportState.value }, '已导出')
}

// ---------- 网格项 ----------

function onTileClick(tile: CommonTile) {
  if (tile.expand) {
    toggleExpand(tile.expand)
    return
  }
  if (tile.command) {
    void flipCmd.run({ direction: tile.command as never }, '已执行')
  }
}

/**
 * 把当前展开的子面板加入自由面板（C-2：复用自由面板数据）。
 *
 * 原版文案「不支持添加自定义面板」指自由面板区域为空时的情形
 * （`docs/页面/05-常用.md:85`）。
 */
function addToFreePanel() {
  if (!expanded.value) return
  const tile = COMMON_TILES.find((item) => item.expand === expanded.value)
  if (!tile) return
  if (!freePanelBlocks.value.length) {
    feedback.warn('不支持添加自定义面板')
    return
  }
  // key 与 `domain/free-panel-legacy.ts` 的映射一一对应；
  // option 里存面板当前状态，添加后从自由面板直接执行同一能力。
  openFreePanelPicker(
    [{ text: tile.text, key: `commonUse.${expanded.value}`, option: currentPanelOption() }],
    '请选择区域',
  )
}

/** 当前展开子面板的状态快照，作为自由面板项的 `option` */
function currentPanelOption(): Record<string, unknown> {
  switch (expanded.value) {
    case 'embed':
      return { ...embedState.value }
    case 'import':
      return { paths: [] as string[], ...importState.value }
    case 'optimization':
      return { ...optimizeState.value }
    case 'customChange':
      return {
        params: [
          Number(changeState.value.number) || 0,
          Number(changeState.value.angle) || 0,
          changeState.value.leftRigth,
          changeState.value.topBottom,
          changeState.value.pointIndex,
          Number(changeState.value.scale) || 0,
          Number(changeState.value.opacity) || 0,
        ],
      }
    case 'export':
      return { mode: 'image', options: { ...exportState.value } }
    case 'reference':
      return { action: 'toggle', options: { width: referenceState.value.width } }
    case 'spacing':
      return {
        params: [
          0,
          Number(spacingState.value.width) || 0,
          spacingState.value.mode === 'layer' ? 1 : 2,
        ],
      }
    default:
      return {}
  }
}

async function confirmFreePanelAdd(blockId: number) {
  await confirmFreePanel(blockId)
}

// ---------- 自由面板区（C-2：复用自由面板数据与组件） ----------

/**
 * 常用页里的「自定义面板」区直接渲染自由面板的 block 树，
 * 执行走 `freePanel.execute`——**不新开一条执行通道**。
 */
function runFreePanelItem(blockId: number, item: { btnId: number; text: string }) {
  void freePanelExecuteCmd.run({ blockId, btnId: item.btnId }, `已执行「${item.text}」`)
}

onMounted(() => {
  // 自由面板区要用区域树；先读一次
  void freePanelStore.load()
})

// ---------- 拖拽排序（原版 `am()`，见 `composables/useLongPressDrag`） ----------

const gridRef = ref<HTMLElement | null>(null)
const drag = useLongPressDrag()
let dragFrom = -1
let dragTo = -1
const dragDrop = ref<'before' | 'after' | undefined>(undefined)

function tileTargets(): HTMLElement[] {
  const root = gridRef.value
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>('[data-tile-key]'))
}

function onTileMouseDown(event: MouseEvent, index: number) {
  dragFrom = index
  dragTo = -1
  dragDrop.value = undefined

  const started = drag.start({
    event,
    node: event.currentTarget as HTMLElement,
    axis: 'x',
    targets: tileTargets,
    onHover: (element, position) => {
      const key = element.dataset.tileKey
      dragTo = tiles.value.findIndex((tile) => tile.key === key)
      dragDrop.value = position
    },
    onEnd: (result) => void endTileDrag(result),
  })

  if (!started) dragFrom = -1
}

async function endTileDrag(result: LongPressDragResult) {
  const from = dragFrom
  const to = dragTo
  dragFrom = -1
  dragTo = -1
  dragDrop.value = undefined

  if (!result.dragged || from < 0 || to < 0 || from === to) return

  const list = tiles.value.slice()
  const [moved] = list.splice(from, 1)
  list.splice(to, 0, moved)
  tileOrder.value = list.map((tile) => tile.key)
}
</script>

<template>
  <PageShell>
    <div class="common-use u-scroll">
      <!-- 放大组 -->
      <div class="common-use__group">
        <GInput
          v-model="zoomValue"
          size="small"
          class="common-use__zoom-input"
          placeholder="倍数"
          @enter="applyCustomZoom"
        />
        <div class="common-use__buttons">
          <GButton
            v-for="scale in ENLARGE_PRESETS"
            :key="scale"
            size="small"
            width="quarter"
            @click="applyZoom(scale)"
          >
            {{ scale }}
          </GButton>
        </div>
      </div>
      <button
        class="common-use__toggle"
        type="button"
        :class="{ 'is-open': enlargeOpen }"
        @click="toggleEnlarge"
      >
        整体放大
      </button>
      <div v-show="enlargeOpen" class="common-use__row">
        <GButton
          v-for="scale in ENLARGE_ALL_PRESETS"
          :key="scale"
          size="small"
          width="fifth"
          @click="applyZoom(scale)"
        >
          {{ scale }}
        </GButton>
      </div>

      <!-- 缩小组 -->
      <div class="common-use__group common-use__group--narrow">
        <GInput
          v-model="zoomValue"
          size="small"
          class="common-use__zoom-input"
          placeholder="倍数"
          @enter="applyCustomZoom"
        />
        <div class="common-use__buttons">
          <GButton
            v-for="scale in NARROW_PRESETS"
            :key="scale"
            size="small"
            width="quarter"
            @click="applyZoom(scale)"
          >
            {{ scale }}
          </GButton>
        </div>
      </div>
      <button
        class="common-use__toggle"
        type="button"
        :class="{ 'is-open': narrowOpen }"
        @click="toggleNarrow"
      >
        整体缩小
      </button>
      <div v-show="narrowOpen" class="common-use__row">
        <GButton
          v-for="scale in NARROW_ALL_PRESETS"
          :key="scale"
          size="small"
          width="fifth"
          @click="applyZoom(scale)"
        >
          {{ scale }}
        </GButton>
      </div>

      <!-- 翻转组 -->
      <div class="common-use__flips">
        <button
          v-for="item in FLIP_ITEMS"
          :key="item.label"
          class="common-use__flip"
          type="button"
          :title="item.label"
          @click="applyFlip(item.direction)"
        >
          <Icon :name="item.icon" size="md" />
        </button>
      </div>

      <hr class="common-use__line" />

      <!-- 常用功能网格 -->
      <div ref="gridRef" class="common-use__grid">
        <GTile
          v-for="(tile, index) in tiles"
          :key="tile.key"
          :icon="tile.icon"
          :text="tile.text"
          :drop="dragDrop && index === dragTo ? dragDrop : undefined"
          :data-tile-key="tile.key"
          @click="onTileClick(tile)"
          @mousedown="onTileMouseDown($event, index)"
        />
      </div>

      <!-- 展开后的功能面板 -->
      <section v-if="expanded" class="common-use__panel">
        <header class="common-use__panel-head">
          <span class="common-use__panel-title">{{ expandedTitle }}</span>
          <GButton size="small" type="text" @click="expanded = null">收起</GButton>
        </header>

        <ComEmbed
          v-if="expanded === 'embed'"
          v-model="embedState"
          @embed="runEmbed"
          @to-link="runEmbed"
          @to-smart-object="runEmbed"
        />
        <ComImport v-else-if="expanded === 'import'" v-model="importState" @import="runImport" />
        <ComOptimization
          v-else-if="expanded === 'optimization'"
          v-model="optimizeState"
          @optimize="runOptimize"
        />
        <CustomChange
          v-else-if="expanded === 'customChange'"
          v-model="changeState"
          @generate="runTransform"
          @reset="resetChange"
        />
        <ComExport
          v-else-if="expanded === 'export'"
          v-model="exportState"
          @export="runExport"
          @open-folder="openFolderCmd.run(undefined, '已打开所在目录')"
        />
        <ComReference
          v-else-if="expanded === 'reference'"
          v-model="referenceState"
          @apply="runReference('toggle')"
          @clear="runReference('clear')"
          @slice="runReference('slice')"
        />
        <ComSpacing
          v-else-if="expanded === 'spacing'"
          v-model="spacingState"
          @distribute="runDistribute"
        />

        <GButton width="full" class="common-use__panel-add" @click="addToFreePanel">
          添加到自由面板
        </GButton>
      </section>

      <!-- 自定义面板区（C-2：复用自由面板） -->
      <section v-if="freePanelStore.blocks.length" class="common-use__free">
        <h2 class="common-use__free-title">自定义面板</h2>
        <FreePanelBlock
          v-for="block in freePanelStore.blocks"
          :key="block.id"
          :block="block"
          @execute="runFreePanelItem"
        />
      </section>

      <EmptyState
        v-if="!tiles.length"
        compact
        class="common-use__empty"
        text="还没有常用功能，请先添加。"
      />
    </div>

    <FreePanelRegionPicker
      v-model:visible="freePanelVisible"
      :title="freePanelTitle"
      :blocks="freePanelBlocks"
      @confirm="confirmFreePanelAdd"
    />

    <CepModal v-model:visible="psdConfirm" title="提示" ok-text="继续" @ok="confirmPsdExport">
      <p class="common-use__tip">文件夹内 PSD 较多，导出时间较长是否继续？</p>
    </CepModal>
  </PageShell>
</template>

<style scoped>
.common-use {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding-top: var(--sp-3);
  background: var(--c-sunken);
}

.common-use__group {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 0 0 0 var(--sp-exact-10);
}

.common-use__group--narrow {
  margin-top: var(--sp-4);
}

.common-use__zoom-input {
  flex: 0 0 60px;
}

.common-use__buttons {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: var(--sp-2);
}

.common-use__toggle {
  align-self: flex-start;
  margin-top: var(--sp-3);
  margin-left: var(--sp-exact-10);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-dim);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.common-use__toggle.is-open {
  color: var(--text-strong);
}

.common-use__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
  padding: var(--sp-3) 0 0 var(--sp-exact-10);
}

.common-use__flips {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  margin-top: var(--sp-exact-12);
  padding: 0 0 0 var(--sp-exact-10);
}

.common-use__flip {
  display: inline-flex;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.common-use__flip:hover {
  color: var(--text-strong);
}

.common-use__line {
  width: calc(100% - var(--sp-7));
  height: var(--sp-exact-1);
  margin: var(--sp-exact-12) var(--sp-7);
  border: 0;
  background: var(--c-divider);
}

.common-use__grid {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 0 var(--sp-2);
}

.common-use__panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-5);
  padding: var(--sp-4) 0 var(--sp-4) var(--sp-exact-10);
  background: var(--c-sunken);
}

.common-use__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.common-use__panel-title {
  color: var(--text-strong);
  font-size: var(--fs-md);
}

.common-use__panel-add {
  margin-top: var(--sp-3);
}

.common-use__tip {
  margin: 0;
  color: var(--text);
  font-size: var(--fs-md);
}

.common-use__free {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-top: var(--sp-5);
  padding: var(--sp-4) var(--sp-3);
  background: var(--c-sunken);
}

.common-use__free-title {
  margin: 0;
  color: var(--text-strong);
  font-size: var(--fs-md);
  font-weight: 500;
}

.common-use__empty {
  margin: var(--sp-5) 0 0 var(--sp-exact-10);
}
</style>
