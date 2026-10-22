<script setup lang="ts">
import { computed } from 'vue'
import type { CustomRow } from '../types'

/**
 * 预览区（原版 `.preview`，高 155px）。
 *
 * 结构：
 * - 形状示意：格子列 `.f-arrayX.w80` + 格子 `.lie`（`app.v4.js:34792` / `34796`）
 * - 空态：`预览效果`（`.f-center.h100` / `.f-size16`，`:34811` / `:34813`）
 *
 * UNVERIFIED: **格子数由形状/参数决定，原版未提取**（`docs/组件库/页面契约.md:241`）。
 * 这里按「行文案的表达式语法」推出块数与比例：说明块写明
 * `1:2:1` = 按比例生成 3 块、`3=1>2` = 生成 3 块第 1 块比例为 2、
 * `3=1%50` = 生成 3 块第 1 块占 50%（`04-自定义.md` 说明块文案）。
 * 即：`a:b:c` 直接给比例；`n=...` 给块数与首块规则。
 * 解析规则是我方推断，标 UNVERIFIED；真机可能完全不同。
 */
const props = defineProps<{
  rows: CustomRow[]
}>()

/** 一行的解析结果：块数 + 每块相对权重 */
interface Blocks {
  count: number
  weights: number[]
}

/** 解析一行文案 → 块数与比例。无法解析时返回 null */
function parseRow(text: string): Blocks | null {
  const raw = text.trim()
  if (!raw) return null

  // `n=...`：n 是块数。`n=1>2` 首块比例 2；`n=1%50` 首块占 50%
  const eq = raw.match(/^(\d+)\s*=\s*(.*)$/)
  if (eq) {
    const count = Number(eq[1])
    if (!Number.isFinite(count) || count < 1) return null
    const rest = eq[2]
    const weights = new Array(count).fill(1)
    const gt = rest.match(/^1\s*>\s*(\d+(?:\.\d+)?)$/)
    if (gt) weights[0] = Number(gt[1])
    const pct = rest.match(/^1\s*%\s*(\d+(?:\.\d+)?)$/)
    if (pct) weights[0] = Number(pct[1]) * (count - 1)
    return { count, weights }
  }

  // `a:b:c`：比例列表
  if (raw.includes(':')) {
    const weights = raw.split(':').map((part) => Number(part.trim()))
    if (weights.some((value) => !Number.isFinite(value) || value <= 0)) return null
    return { count: weights.length, weights }
  }

  return null
}

const blocks = computed<Blocks[]>(() =>
  props.rows.map((row) => parseRow(row.text)).filter((item): item is Blocks => item !== null),
)

/** 所有行合成一块：总块数与总权重 */
const total = computed(() => {
  const count = blocks.value.reduce((sum, item) => sum + item.count, 0)
  const weight = blocks.value.reduce(
    (sum, item) => sum + item.weights.reduce((a, b) => a + b, 0),
    0,
  )
  return { count, weight }
})

/** 每块的宽度百分比（相对整条） */
const cells = computed(() => {
  if (!total.value.count || !total.value.weight) return []
  const out: { key: string; width: number }[] = []
  blocks.value.forEach((group, groupIndex) => {
    group.weights.forEach((weight, index) => {
      out.push({
        key: `${groupIndex}-${index}`,
        width: (weight / total.value.weight) * 100,
      })
    })
  })
  return out
})
</script>

<template>
  <div class="custom-preview">
    <div v-if="cells.length" class="custom-preview__grid">
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="custom-preview__cell"
        :style="{ '--cell-width': `${cell.width}%` }"
      />
    </div>
    <div v-else class="custom-preview__empty">
      <p>预览效果</p>
    </div>
  </div>
</template>

<style scoped>
/* 原版 .preview{height:155px; padding:10px 0; justify-content:space-between} */
.custom-preview {
  display: flex;
  width: 100%;
  height: 155px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-exact-10) 0;
}

.custom-preview__grid {
  display: flex;
  width: 80%;
  flex-direction: row;
}

/* 原版 .lie{background-color:#535353; margin-left:2px; margin-top:2px} */
.custom-preview__cell {
  width: var(--cell-width, 0%);
  height: var(--sp-5);
  margin-top: var(--sp-1);
  margin-left: var(--sp-1);
  background: var(--c-custom-lie);
}

.custom-preview__empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.custom-preview__empty p {
  margin: 0;
  font-size: var(--fs-name);
}
</style>
