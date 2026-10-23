<script setup lang="ts">
import CheckBox from '@/components/CheckBox.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import { useOptionRef } from '../useCommonUseOptions'

/**
 * ③ 导入多图片（官方 `comimport`，render `vp()` `app.v4.js:35909`）。
 * 结构：**只有一行勾选**，根高 40px、无 hr、无按钮（`:35914`）。
 * TODO(T-88): 值应落 `sj_set.json` 的 `cyImportToLinkObject`（官方 `:37685`），本轮只做界面。
 */
const toLinkObject = useOptionRef('cyImportToLinkObject', false)
</script>

<template>
  <div class="panel-import">
    <SettingsRow><CheckBox v-model="toLinkObject">转成链接智能对象</CheckBox></SettingsRow>
  </div>
</template>

<style scoped>
.panel-import {
  display: flex;
  flex-direction: column;
  padding: var(--sp-5) 0;
}
</style>
