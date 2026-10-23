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
  type FlipDirection,
} from '@/commands/commonUse'
import { useCommonUseStore } from '@/stores/common-use'
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
const { tiles, loading, error, degraded } = storeToRefs(store)

const zoomCmd = useCommand('commonUse.zoom')
const flipCmd = useCommand('commonUse.flip')

/** 官方「放大 ▾」/「缩小 ▾」胶囊：一个选项 = 当前值展示（点开是否弹选项未实测，见 GSegment） */
const ZOOM_LABEL = [
  { value: 'scale', label: '放大' },
  { value: 'narrow', label: '缩小' },
] as const

/**
 * 官方 6 向翻转的图标与提示（`app.v4.js:37567-37591`，18×18，`.svg-18` CSS 位置见规格 35620）。
 * **方向文本只从 `commands/commonUse.ts` 的 `FLIP_DIRECTIONS` 来**（与命令校验同一份），
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
const activeId = ref('')

const ready = computed(() => !loading.value && !error.value)

onMounted(() => {
  void store.load()
  store.loadCollapsed()
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
          :options="row === 'scale' ? [ZOOM_LABEL[0]] : [ZOOM_LABEL[1]]"
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

      <!-- 功能格：顺序来自 sj_commonFunction.json（页面不写任何 id 字面量） -->
      <div v-if="tiles.length" class="page-common-use__grid">
        <UseGridItem
          v-for="tile in tiles"
          :key="tile.id"
          :tile="tile"
          :active="activeId === tile.id"
          @click="activeId = activeId === tile.id ? '' : tile.id"
        />
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

/* 每行 3 个（官方 `open()` 用 Math.floor(i/3) 算行号，`:38201`；宽度 `.context-one-wrap` 33%，CSS 位置 110803） */
.page-common-use__grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  row-gap: var(--sp-5);
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
