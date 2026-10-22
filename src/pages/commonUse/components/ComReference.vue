<script setup lang="ts">
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'

/**
 * comreference（参考线工具）子面板。
 *
 * 原版 render `Bp()`（`app.v4.js:37097`）：
 * 1 个勾选 + 宽度输入 + 「应用」 + 2 个按钮。
 */
const model = defineModel<{ smartGuides: boolean; width: string }>({ required: true })

defineEmits<{
  (e: 'apply'): void
  (e: 'clear'): void
  (e: 'slice'): void
}>()
</script>

<template>
  <div class="cu-reference">
    <CheckBox v-model="model.smartGuides">开启智能参考线(使用后请关闭)</CheckBox>
    <div class="cu-reference__row">
      <GInput v-model="model.width" size="small" placeholder="宽度" />
      <GButton size="small" @click="$emit('apply')">应用</GButton>
    </div>
    <hr class="cu-line" />
    <div class="cu-reference__row">
      <GButton width="half" @click="$emit('clear')">清除参考线</GButton>
      <GButton width="half" @click="$emit('slice')">基于参考线切片</GButton>
    </div>
  </div>
</template>

<style scoped>
.cu-reference {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) 0 0 var(--sp-exact-10);
}

.cu-reference__row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.cu-line {
  width: 100%;
  height: var(--sp-exact-1);
  margin: var(--sp-3) 0;
  border: 0;
  background: var(--c-divider);
}
</style>
