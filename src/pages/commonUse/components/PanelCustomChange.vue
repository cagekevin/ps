<script setup lang="ts">
import { ref } from 'vue'
import GAnchorGrid, { type AnchorId } from '@/components/GAnchorGrid.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import SettingsRow from '@/components/SettingsRow.vue'

/**
 * ⑧ 自定义变换（官方 `comcustomChange`，render `Ip()` `app.v4.js:36062`）。
 * 结构：3 行「两个等宽输入」（`:36076-36177`）→ 九宫格锚点（两段容器 `:36198`/`:36223`）
 * → hr → 一行两个 50% 按钮（`:36253-36265`）。
 * TODO(T-88): 6 个输入与锚点选择应可保存（`getOption()`），本轮只做界面。
 */
const number = ref('1')
const angle = ref('0')
const leftRight = ref('0px')
const topBottom = ref('0px')
const pointIndex = ref('0')
const scale = ref('100')
const anchor = ref<AnchorId | ''>('')
</script>

<template>
  <div class="panel-custom">
    <SettingsRow>
      <GInput v-model="number" class="u-fill" size="small" />
      <GInput v-model="angle" class="u-fill" size="small" />
    </SettingsRow>
    <SettingsRow>
      <GInput v-model="leftRight" class="u-fill" size="small" />
      <GInput v-model="topBottom" class="u-fill" size="small" />
    </SettingsRow>
    <SettingsRow>
      <GInput v-model="pointIndex" class="u-fill" size="small" />
      <GInput v-model="scale" class="u-fill" size="small" />
    </SettingsRow>

    <GAnchorGrid v-model="anchor" class="panel-custom__anchors" />

    <hr class="panel-custom__rule" />

    <SettingsRow>
      <GButton width="half">生成变换</GButton>
      <GButton width="half">重置参数</GButton>
    </SettingsRow>
  </div>
</template>

<style scoped>
.panel-custom {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-5) 0;
}

.panel-custom__anchors {
  width: 100%;
}

.panel-custom__rule {
  height: 1px;
  margin: var(--sp-2) 0;
  border: none;
  background: var(--c-divider);
}
</style>
