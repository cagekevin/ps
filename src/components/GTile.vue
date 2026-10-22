<script setup lang="ts">
/**
 * 常用网格项（用户批准的「GTile」）。
 *
 * 原版 `.context-one-wrap`（`/commonUse`，render `cp()` `app.v4.js:35642`）：
 * - 32×32 圆角图标块 `.context-svg-wrap`（圆角 10px，底 `#222`）
 * - 下方文案 `.context-text`
 * - 每行 3 个（`width:33%`）
 *
 * 为什么不用 `ActionGrid`：它渲染的是 `GButton.is-grid` 的 24px 横条
 * （原版 `.btn-min`），与原版常用项的 32×32 圆角块视觉不同；
 * 硬套就得改 `GButton` 变体并波及已完成的自由面板页（撞冻结）。
 * 选型见 `docs/组件库/页面契约.md` C-6。
 */
import Icon from '@/components/Icon.vue'

withDefaults(
  defineProps<{
    /** 图标名（sprite symbol id） */
    icon?: string
    /** 文案 */
    text?: string
    /** 拖拽落点提示：before / after / 无 */
    drop?: 'before' | 'after'
    /** 是否是展开态（副标题 / 角标） */
    active?: boolean
  }>(),
  { drop: undefined, active: false },
)

defineEmits<{
  (e: 'click', ev: MouseEvent): void
  /** 拖拽起手：页面据此调 `useLongPressDrag`（原版 `am()`） */
  (e: 'mousedown', ev: MouseEvent): void
}>()
</script>

<template>
  <div
    class="g-tile"
    :class="{ 'is-drop-before': drop === 'before', 'is-drop-after': drop === 'after' }"
    @mousedown="$emit('mousedown', $event)"
  >
    <button class="g-tile__icon" type="button" :title="text" @click="$emit('click', $event)">
      <Icon v-if="icon" :name="icon" size="lg" />
    </button>
    <p v-if="text" class="g-tile__text">{{ text }}</p>
    <slot />
  </div>
</template>

<style scoped>
.g-tile {
  display: flex;
  width: 33.33333%;
  flex-direction: column;
  align-items: center;
  margin-top: var(--sp-5);
}

/* 原版 `.context-svg-wrap`：32×32、圆角 10px、底色 #222 */
.g-tile__icon {
  display: flex;
  width: var(--g-tile-size, var(--h-tile));
  height: var(--g-tile-size, var(--h-tile));
  align-items: center;
  justify-content: center;
  margin-bottom: var(--sp-3);
  padding: 0;
  border: 0;
  border-radius: var(--g-tile-radius, var(--r-tile));
  background: var(--c-sunken);
  color: var(--c-accent);
  cursor: pointer;
}

.g-tile__icon:hover {
  background: var(--c-surface-raised);
}

/* 原版 `.context-text`：默认字色、可点 */
.g-tile__text {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  color: var(--text);
  font-size: var(--fs-md);
  line-height: var(--fs-md);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.g-tile.is-drop-before {
  box-shadow: inset 2px 0 0 var(--accent);
}

.g-tile.is-drop-after {
  box-shadow: inset -2px 0 0 var(--accent);
}
</style>
