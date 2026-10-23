<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import EmptyState from '@/components/EmptyState.vue'
import GButton from '@/components/GButton.vue'
import GSegment from '@/components/GSegment.vue'
import Icon from '@/components/Icon.vue'
import NewSpin from '@/components/NewSpin.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import { useCommand } from '@/components/command/useCommand'
import {
  ENLARGE_PRESETS,
  FLIP_DIRECTIONS,
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
const { tiles, collapsed, loading, error, degraded } = storeToRefs(store)

const zoomCmd = useCommand('commonUse.zoom')
const flipCmd = useCommand('commonUse.flip')
const setCollapsedCmd = useCommand('commonUse.setCollapsed')

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
const gridRows = computed(() => {
  const rows: CommonUseTile[][] = []
  for (const tile of tiles.value) {
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

/** 该行要显示的面板（该行有格子处于展开态且有 `comName`） */
function panelOfRow(row: CommonUseTile[]) {
  const tile = row.find((item) => item.id === expandedId.value)
  return tile?.comName ? PANELS[tile.comName] : undefined
}

function toggle(tile: CommonUseTile) {
  // 没有子面板的格子点了不做事（官方这类格直接执行功能，接线在 T-88c）
  if (!tile.comName) return
  const open = expandedId.value !== tile.id
  expandedId.value = open ? tile.id : ''
  void setCollapsedCmd.run({ id: tile.id, collapsed: !open })
}

const ready = computed(() => !loading.value && !error.value)

onMounted(async () => {
  await store.load()
  store.loadCollapsed()
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
    <p v-if="degraded" class="page-common-use__warn">{{ degraded }}，常用项可能不完整</p>

    <p v-if="error" class="page-common-use__error">
      {{ error }}
      <GButton size="small" type="text" @click="store.load()">重试</GButton>
    </p>

    <div v-if="loading" class="page-common-use__loading">
      <NewSpin tip="正在读取常用项…" />
    </div>

    <template v-else-if="ready">
      <!-- 放大行 / 缩小行：左胶囊 + 4 颗 25% 预设（官方 `.partBtn-wrap` + `.btn-small-4`，`:35485-35489`） -->
      <SettingsRow
        v-for="row in ['scale', 'narrow'] as const"
        :key="row"
        class="page-common-use__row"
      >
        <GSegment
          :model-value="row"
          :options="
            row === 'scale'
              ? [{ value: 'scale', label: '放大' }]
              : [{ value: 'narrow', label: '缩小' }]
          "
          chevron
          :aria-label="row === 'scale' ? '放大倍数' : '缩小倍数'"
        />
        <GButton
          v-for="scale in row === 'scale' ? ENLARGE_PRESETS : NARROW_PRESETS"
          :key="scale"
          size="small"
          width="quarter"
          @click="zoom(scale)"
        >
          {{ scale }}
        </GButton>
      </SettingsRow>

      <!-- 翻转 6 颗：图标按钮，18px（官方 `baseIcon svgWidth:18px`，`:35617-35621`） -->
      <div class="page-common-use__flip">
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

      <hr class="page-common-use__rule" />

      <!-- 功能格：顺序来自 sj_commonFunction.json（页面不写任何 id 字面量）；每行 3 个 -->
      <div v-if="tiles.length" class="page-common-use__grid">
        <template v-for="(row, rowIndex) in gridRows" :key="rowIndex">
          <div class="page-common-use__grid-row">
            <UseGridItem v-for="tile in row" :key="tile.id" :tile="tile" @click="toggle(tile)" />
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
.page-common-use__flip + .page-common-use__rule {
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
