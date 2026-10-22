<script setup lang="ts">
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import Icon from '@/components/Icon.vue'
import { ANCHOR_ICONS } from '../types'

/**
 * comcustomChange（自定义变换）子面板。
 *
 * 原版 render `Ip()`（`app.v4.js:36062`）：
 * 6 个 `baseIconInput`（两列三行）+ 9 个锚点图标 + 2 个按钮。
 *
 * 参数顺序 `[number, angle, leftRigth, topBottom, pointIndex, scale, opacity]`
 * （`docs/页面/05-常用.md:57`），默认值 `angle=0 / leftRigth="0px" / topBottom="0px" /
 * scale=100 / opacity=0`（`:59`）。
 *
 * 校验文案见 `:60`：比例 ≤0 或 >9999 报错、个数 <1 报错、透明度 >99 报错。
 * 校验放在**命令层之前**的页面侧（前置校验才直接 feedback.error，
 * 见 AGENTS 硬规则第 4 条）。
 */
const model = defineModel<{
  number: string
  angle: string
  leftRigth: string
  topBottom: string
  pointIndex: number
  scale: string
  opacity: string
}>({ required: true })

defineEmits<{
  (e: 'generate'): void
  (e: 'reset'): void
}>()
</script>

<template>
  <div class="cu-change">
    <div class="cu-change__row">
      <GInput v-model="model.number" size="small" placeholder="个数" />
      <GInput v-model="model.angle" size="small" placeholder="角度" />
    </div>
    <div class="cu-change__row">
      <GInput v-model="model.leftRigth" size="small" placeholder="左右" />
      <GInput v-model="model.topBottom" size="small" placeholder="上下" />
    </div>
    <div class="cu-change__row">
      <GInput v-model="model.scale" size="small" placeholder="比例" />
      <GInput v-model="model.opacity" size="small" placeholder="透明度" />
    </div>

    <div class="cu-change__anchors">
      <button
        v-for="(icon, index) in ANCHOR_ICONS"
        :key="icon"
        class="cu-change__anchor"
        :class="{ 'is-active': index === model.pointIndex }"
        type="button"
        :aria-label="`锚点 ${index + 1}`"
        :aria-pressed="index === model.pointIndex"
        @click="model.pointIndex = index"
      >
        <Icon :name="icon" size="sm" />
      </button>
    </div>

    <hr class="cu-line" />

    <div class="cu-change__row">
      <GButton width="half" @click="$emit('generate')">生成变换</GButton>
      <GButton width="half" @click="$emit('reset')">重置参数</GButton>
    </div>
  </div>
</template>

<style scoped>
.cu-change {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) 0 0 var(--sp-exact-10);
}

.cu-change__row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.cu-change__anchors {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}

.cu-change__anchor {
  display: inline-flex;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
}

.cu-change__anchor.is-active {
  color: var(--accent);
}

.cu-line {
  width: 100%;
  height: var(--sp-exact-1);
  margin: var(--sp-3) 0;
  border: 0;
  background: var(--c-divider);
}
</style>
