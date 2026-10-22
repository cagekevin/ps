<script setup lang="ts">
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'

/**
 * comoptimization（批量优化文档）子面板。
 *
 * 原版 render `kp()`（`app.v4.js:35937`）：3 个勾选 + 1 个全宽按钮。
 * 三个开关名见 `docs/页面/05-常用.md:58`。
 *
 * 进度由命令上报（`commonUse.optimizeDoc` 是 `kind: 'long'`，
 * registry 统一 begin/end），面板不自己转圈。
 */
const model = defineModel<{
  optimizeAll: boolean
  deleteAllEmpty: boolean
  deleteAllHide: boolean
}>({ required: true })

defineEmits<{ (e: 'optimize'): void }>()
</script>

<template>
  <div class="cu-optimization">
    <CheckBox v-model="model.optimizeAll">优化所有智能对象图层</CheckBox>
    <CheckBox v-model="model.deleteAllEmpty">删除所有空图层</CheckBox>
    <CheckBox v-model="model.deleteAllHide">删除所有隐藏图层</CheckBox>
    <GButton width="full" class="cu-optimization__run" @click="$emit('optimize')">
      批量优化文档
    </GButton>
  </div>
</template>

<style scoped>
.cu-optimization {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) 0 0 var(--sp-exact-10);
}

.cu-optimization__run {
  margin-top: var(--sp-3);
}
</style>
