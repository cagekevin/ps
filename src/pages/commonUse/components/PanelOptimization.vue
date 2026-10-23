<script setup lang="ts">
import { ref } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import { useCommand } from '@/components/command/useCommand'

/**
 * ⑦ 优化文档（官方 `comoptimization`，render `kp()` `app.v4.js:35937`）。
 * 结构：3 勾选 + 一个**整宽**按钮「批量优化文档」（`:35951-35977`），无 hr；
 * 官方**只有这一个按钮**（没有「优化当前文档」，见契约文案台账）。
 * TODO(T-88): 3 个勾选应落 `cyOptimizeAll` / `cyOptimizeDeleteAllEmpty` / `cyOptimizeDeleteAllHide`。
 */
const optimizeAll = ref(true)
const deleteAllEmpty = ref(false)
const deleteAllHide = ref(false)
const optimizeFolderCmd = useCommand('commonUse.optimizeFolder')
</script>

<template>
  <div class="panel-optimization">
    <SettingsRow><CheckBox v-model="optimizeAll">优化所有智能对象图层</CheckBox></SettingsRow>
    <SettingsRow><CheckBox v-model="deleteAllEmpty">删除所有空图层</CheckBox></SettingsRow>
    <SettingsRow><CheckBox v-model="deleteAllHide">删除所有隐藏图层</CheckBox></SettingsRow>
    <SettingsRow>
      <GButton
        type="primary"
        width="full"
        @click="
          optimizeFolderCmd.run({
            options: {
              optimizeAll: optimizeAll,
              deleteAllEmpty: deleteAllEmpty,
              deleteAllHide: deleteAllHide,
            },
          })
        "
      >
        批量优化文档
      </GButton>
    </SettingsRow>
  </div>
</template>

<style scoped>
.panel-optimization {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-5) 0;
}
</style>
