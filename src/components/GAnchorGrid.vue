<script lang="ts">
/**
 * 锚点（"变换点"）分组：分组即数据，组件内部只 `v-for rows`。
 *
 * 官方 `comcustomChange` 的**两段** v-for 容器 `.svg-wrap-one` / `.svg-wrap-two`（`app.v4.js:36199` / `:36224`），
 * 数据是 `svgOne`（6 项，`:36278-36296`）与 `svgTwo`（6 项，`:36297-36315`）→ **两行、每行 6 个、共 12 个**。
 * **12 = 位置格数（点得到的格子）；9 = 不同图标数（第 10–12 格复用第 9 张图，官方 `:36297-36315`，重复处 `:36304-36314`）**——两个数不是矛盾，别混。
 * 选中是**下标**（官方 `pointIdex`，`:36277`）。
 *
 * 为什么是常量而不是 prop：页面只传 `rows`，组件没有 columns / rowsCount 之类能改排法的入口，
 * 所以"第三种排法"写不出来；真要改分组只改这一个常量。
 */
export const ANCHOR_ROWS = [
  [
    'iconmaodianbianhuandianweizhi1',
    'iconmaodianbianhuandianweizhi2',
    'iconmaodianbianhuandianweizhi3',
    'iconmaodianbianhuandianweizhi4',
    'iconmaodianbianhuandianweizhi5',
    'iconmaodianbianhuandianweizhi6',
  ],
  [
    'iconmaodianbianhuandianweizhi7',
    'iconmaodianbianhuandianweizhi8',
    'iconmaodianbianhuandianweizhi9',
    'iconmaodianbianhuandianweizhi9',
    'iconmaodianbianhuandianweizhi9',
    'iconmaodianbianhuandianweizhi9',
  ],
] as const

/** 行/列 → 展平后的全局下标（官方 `pointIdex` 就是这个序号） */
export function flatIndex(
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  rowIndex: number,
  cellIndex: number,
): number {
  let base = 0
  for (let i = 0; i < rowIndex; i += 1) base += rows[i].length
  return base + cellIndex
}
</script>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'

withDefaults(
  defineProps<{
    /** 选中的锚点下标（官方 `pointIdex`）；-1 = 未选 */
    modelValue?: number
    rows?: ReadonlyArray<ReadonlyArray<string>>
  }>(),
  { modelValue: -1, rows: () => ANCHOR_ROWS },
)

defineEmits<{ (e: 'update:modelValue', index: number): void }>()
</script>

<template>
  <div class="g-anchor-grid" role="radiogroup" aria-label="变换锚点">
    <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="g-anchor-grid__row">
      <button
        v-for="(icon, cellIndex) in row"
        :key="`${rowIndex}-${cellIndex}`"
        class="g-anchor-grid__cell"
        :class="{ 'is-active': flatIndex(rows, rowIndex, cellIndex) === modelValue }"
        type="button"
        role="radio"
        :aria-checked="flatIndex(rows, rowIndex, cellIndex) === modelValue"
        :aria-label="`锚点 ${flatIndex(rows, rowIndex, cellIndex) + 1}`"
        @click="$emit('update:modelValue', flatIndex(rows, rowIndex, cellIndex))"
      >
        <Icon :name="`#${icon}`" size="lg" />
      </button>
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
  display: flex;
  width: var(--g-anchor-size, 18px);
  height: var(--g-anchor-size, 18px);
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--c-sunken);
  color: var(--text);
  cursor: pointer;
}

.g-anchor-grid__cell.is-active {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--c-text-inverse);
}
</style>
