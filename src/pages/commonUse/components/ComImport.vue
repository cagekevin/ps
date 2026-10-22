<script setup lang="ts">
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'

/**
 * comimport（导入多图片）子面板。
 *
 * 原版 render `vp()`（`app.v4.js:35909`）：整块只有 1 个勾选
 * —— 「转成链接智能对象」。
 *
 * 原版这个子组件**只有 `data(){set}`，没有任何方法**（`docs/页面/05-常用.md:23`），
 * 所以「导入多图片」这个动作本身走父级的 `importMultipleImage`，
 * 面板里的勾选只决定导入时是否转成链接智能对象（开关进命令 payload）。
 */
const model = defineModel<{ linkSmartObject: boolean }>({ required: true })

defineEmits<{ (e: 'import'): void }>()
</script>

<template>
  <div class="cu-import">
    <CheckBox v-model="model.linkSmartObject">转成链接智能对象</CheckBox>
    <GButton size="small" class="cu-import__run" @click="$emit('import')">导入多图片</GButton>
  </div>
</template>

<style scoped>
.cu-import {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: var(--h-row);
  padding: 0 0 0 var(--sp-exact-10);
}

.cu-import__run {
  margin-left: auto;
}
</style>
