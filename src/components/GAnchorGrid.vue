<script lang="ts">
/**
 * 九宫格锚点的**分组**：分组即数据，`GAnchorGrid` 内部只 `v-for rows`。
 *
 * 官方 `comcustomChange` 的两段容器 `.svg-wrap-one` / `.svg-wrap-two`（`app.v4.js:36198` / `:36223`），
 * 每段是 v-for，**每段几颗由数据长度决定、源码读不到** → 这里按"九宫格 = 9 个锚点"定为 `[3, 6]`，
 * 与两段容器一致；**仍是 `UNVERIFIED`**（真机若为 3×3 方阵，只改这个常量，组件与页面都不动）。
 *
 * 为什么是常量而不是 prop：见 `docs/组件库/页面契约.md` 的「防错」——页面只传 `rows`，
 * 组件没有 columns / rowsCount 之类能改排法的入口，所以"第三种排法"写不出来。
 */
export const ANCHOR_ROWS = [
  ['topLeft', 'top', 'topRight'],
  ['left', 'center', 'right', 'bottomLeft', 'bottom', 'bottomRight'],
] as const
</script>

<script setup lang="ts">
export type AnchorId = (typeof ANCHOR_ROWS)[number][number]

withDefaults(
  defineProps<{
    /** 当前选中的锚点；空字符串 = 未选 */
    modelValue?: AnchorId | ''
    rows?: ReadonlyArray<ReadonlyArray<AnchorId>>
  }>(),
  { modelValue: '', rows: () => ANCHOR_ROWS },
)

defineEmits<{ (e: 'update:modelValue', value: AnchorId): void }>()

/** 锚点在九宫格里的位置提示（官方无文案，悬停标题是我们的可达性补充） */
const LABELS: Record<AnchorId, string> = {
  topLeft: '左上',
  top: '上',
  topRight: '右上',
  left: '左',
  center: '中',
  right: '右',
  bottomLeft: '左下',
  bottom: '下',
  bottomRight: '右下',
}
</script>

<template>
  <div class="g-anchor-grid" role="radiogroup" aria-label="锚点">
    <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="g-anchor-grid__row">
      <button
        v-for="anchor in row"
        :key="anchor"
        class="g-anchor-grid__cell"
        :class="{ 'is-active': anchor === modelValue }"
        type="button"
        role="radio"
        :aria-checked="anchor === modelValue"
        :title="LABELS[anchor]"
        :aria-label="LABELS[anchor]"
        @click="$emit('update:modelValue', anchor)"
      />
    </div>
  </div>
</template>

<style scoped>
.g-anchor-grid {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.g-anchor-grid__row {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-3);
}

.g-anchor-grid__cell {
  width: var(--g-anchor-size, 18px);
  height: var(--g-anchor-size, 18px);
  padding: 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--c-sunken);
  cursor: pointer;
}

.g-anchor-grid__cell.is-active {
  border-color: var(--accent);
  background: var(--accent);
}
</style>
