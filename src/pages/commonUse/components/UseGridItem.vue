<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { resolveTileIcon, type CommonUseTile } from '@/domain/common-use'

/**
 * 一个功能格（页面私有）。
 *
 * 官方格子外层 33% > 图标块 32×32、圆角 10、底色 `#222`（CSS 位置 110803 / 110327）
 * + `.context-text`（文案）+ `.mark`（右上角标 3×3），见 `app.v4.js:35642-35720`
 * 与 CSS 字符位置 110803 / 110327 / 110725。
 *
 * 只有三层：图标块、文案、角标。**不做 hover 浮层**（官方没有，只换图标）。
 *
 * 悬停态是**组件本地**的：官方 `fillSvgName` 也只被 `.context-svg-wrap` 的
 * `mouseenter`/`mouseleave` 写（`app.v4.js:35674-35681`），逐格本地与"页面一个变量"等价。
 */
const props = defineProps<{
  tile: CommonUseTile
  /** 本格面板是否展开（官方 `openfun == e.name`） */
  expanded?: boolean
  /** `sj_set.json` 的 `cyExport.ext`：导出图片那一格的图标跟着它变（官方 `:35695`） */
  exportExt?: unknown
  /** `sj_set.json` 的 `cyAutoFillColor`：自动填充颜色那一格跟着它变（官方 `:35704`） */
  autoFillColor?: unknown
}>()

defineEmits<{
  (e: 'click'): void
  /** 格子非图标区右键 → 官方 `fpFunction`（加入自由面板 / 两条提示） */
  (e: 'contextmenu', ev: MouseEvent): void
  /** 图标块右键 → 官方 `.context-svg-wrap` 的 `open`（展开面板，`app.v4.js:35682`） */
  (e: 'icon-contextmenu', ev: MouseEvent): void
}>()

const hovered = ref(false)
const iconName = computed(() =>
  resolveTileIcon(props.tile, {
    hovered: hovered.value,
    expanded: props.expanded === true,
    exportExt: props.exportExt,
    autoFillColor: props.autoFillColor,
  }),
)
</script>

<template>
  <button
    class="use-grid-item"
    type="button"
    :data-drop-idx="props.tile.index"
    :title="tile.title"
    @click="$emit('click')"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <span
      class="use-grid-item__icon"
      :class="{ 'is-expanded': props.expanded }"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      @contextmenu.prevent.stop="$emit('icon-contextmenu', $event)"
    >
      <Icon :name="iconName" size="lg" />
      <span v-if="tile.ismark" class="use-grid-item__mark" aria-hidden="true" />
    </span>
    <span class="use-grid-item__text">{{ tile.name }}</span>
  </button>
</template>

<style scoped>
.use-grid-item {
  display: flex;
  width: 33.33%;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.use-grid-item__icon {
  position: relative;
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-tile);
  background: var(--c-sunken);
  color: var(--text-strong);
}

.use-grid-item:hover .use-grid-item__icon,
/* 展开态高亮：官方 `.contextmenu` 与 `:hover` 是**同一档**（背景 #222 + `svg{fill:#006fff}`，
   CSS 字符位置 110438 / 110537）。我方基线底色与悬停两档跟官方相反（基线 #222 / 悬停 #363636，
   既有偏离、不在本刀），所以展开态取"与悬停同底色"的 --c-surface，再单独把图标染蓝，
   保证展开格与基线格肉眼可分。 */
.use-grid-item__icon.is-expanded {
  background: var(--c-surface);
}

.use-grid-item__icon.is-expanded {
  color: var(--accent);
}

.use-grid-item__mark {
  position: absolute;
  top: var(--sp-1);
  right: var(--sp-1);
  width: var(--sp-2);
  height: var(--sp-2);
  border-radius: var(--r-pill);
  background: var(--accent);
}

.use-grid-item__text {
  font-size: var(--fs-md);
  line-height: var(--lh-tight, 1.2);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
