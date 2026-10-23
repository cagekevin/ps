<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import type { CommonUseTile } from '@/domain/common-use'

/**
 * 一个功能格（页面私有）。
 *
 * 官方格子外层 33% > 图标块 32×32、圆角 10、底色 `#222`（CSS 位置 110803 / 110327）
 * + `.context-text`（文案）+ `.mark`（右上角标 3×3），见 `app.v4.js:35642-35720`
 * 与 CSS 字符位置 110803 / 110327 / 110725。
 *
 * 只有三层：图标块、文案、角标。**不做 hover 浮层**（官方没有，只换图标）。
 */
const props = defineProps<{ tile: CommonUseTile }>()

defineEmits<{ (e: 'click'): void; (e: 'contextmenu', ev: MouseEvent): void }>()
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
    <span class="use-grid-item__icon">
      <Icon :name="tile.icon.rest" size="lg" />
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

.use-grid-item:hover .use-grid-item__icon {
  background: var(--c-surface);
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
