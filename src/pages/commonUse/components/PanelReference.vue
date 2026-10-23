<script setup lang="ts">
import { ref } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import SettingsRow from '@/components/SettingsRow.vue'

/**
 * ⑪ 参考线工具（官方 `comreference`，render `Bp()` `app.v4.js:37097`）。
 * 结构：勾选 →「输入(flex:1) + 应用」→ hr → 一行两个 50% 按钮（`:37109-37171`）。
 * TODO(T-88): 勾选与宽度应落 `sj_set.json`，本轮只做界面。
 */
const smartReference = ref(false)
const width = ref('20')
</script>

<template>
  <div class="panel-reference">
    <SettingsRow
      ><CheckBox v-model="smartReference">开启智能参考线(使用后请关闭)</CheckBox></SettingsRow
    >
    <SettingsRow>
      <GInput v-model="width" size="small" class="u-fill" />
      <GButton>应用</GButton>
    </SettingsRow>

    <hr class="panel-reference__rule" />

    <SettingsRow>
      <GButton width="half">清除参考线</GButton>
      <GButton width="half">基于参考线切片</GButton>
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
