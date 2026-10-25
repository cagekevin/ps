<script setup lang="ts">
import { ref } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import { useCommand } from '@/components/command/useCommand'
import { useFeedbackStore } from '@/stores/feedback'

/**
 * ⑪ 参考线工具（官方 `comreference`，render `Bp()` `app.v4.js:37097`）。
 * 结构：勾选 →「输入(flex:1) + 应用」→ hr → 一行两个 50% 按钮（`:37109-37171`）。
 * TODO(T-88): 勾选与宽度应落 `sj_set.json`，本轮只做界面。
 */
const smartReference = ref(false)
const width = ref('20')

const feedback = useFeedbackStore()
const guideCmd = useCommand('commonUse.referenceGuide')
const sliceCmd = useCommand('commonUse.referenceSlice')
/** 官方 `useGuide()`：宽度空则提示「请输入宽度」，否则 `cy_createSafeAreaGuide([width])`（`app.v4.js:37224-37228`） */
const applyGuide = () => {
  if (!width.value) {
    feedback.warn('请输入宽度')
    return
  }
  void guideCmd.invoke({ options: width.value })
}
const clearGuide = () => void sliceCmd.invoke({ options: { mode: 'clear' } })
const makeSlice = () => void sliceCmd.invoke({ options: { mode: 'slice' } })
</script>

<template>
  <div class="panel-reference">
    <SettingsRow
      ><CheckBox v-model="smartReference">开启智能参考线(使用后请关闭)</CheckBox></SettingsRow
    >
    <SettingsRow>
      <GInput v-model="width" size="small" class="u-fill" />
      <GButton @click="applyGuide">应用</GButton>
    </SettingsRow>

    <hr class="panel-reference__rule" />

    <SettingsRow>
      <GButton width="half" @click="clearGuide">清除参考线</GButton>
      <GButton width="half" @click="makeSlice">基于参考线切片</GButton>
    </SettingsRow>
  </div>
</template>

<style scoped>
.panel-reference {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-5) 0;
}

.panel-reference__rule {
  height: 1px;
  margin: var(--sp-2) 0;
  border: none;
  background: var(--c-divider);
}
</style>
