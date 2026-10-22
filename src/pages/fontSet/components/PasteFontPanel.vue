<script setup lang="ts">
import { computed } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import type { PasteFontConfig } from '@/domain/font-set-config'

/**
 * 原版 pasteFont（app.v4.js:39089）：
 * 6 个字段勾选 + 恢复默认。勾掉表示粘贴时该字段传 null。
 */
const props = defineProps<{ keeps: PasteFontConfig }>()
const emit = defineEmits<{
  (e: 'change', patch: Partial<PasteFontConfig>): void
  (e: 'reset'): void
}>()

function field<K extends keyof PasteFontConfig>(key: K) {
  return computed<boolean>({
    get: () => props.keeps[key],
    set: (value) => emit('change', { [key]: value } as Partial<PasteFontConfig>),
  })
}

const scriptFamily = field('scriptFamily')
const color = field('color')
const opacity = field('opacity')
const size = field('size')
const leading = field('leading')
const tracking = field('tracking')
</script>

<template>
  <div class="fontset-panel fontset-paste">
    <div class="fontset-paste__row">
      <CheckBox v-model="scriptFamily">字体</CheckBox>
      <CheckBox v-model="color">颜色</CheckBox>
      <CheckBox v-model="opacity">透明度</CheckBox>
    </div>
    <div class="fontset-paste__row fontset-paste__row--second">
      <CheckBox v-model="size">字号</CheckBox>
      <CheckBox v-model="leading">行距</CheckBox>
      <CheckBox v-model="tracking">字间距</CheckBox>
    </div>
    <button class="fontset-paste__reset" type="button" @click="emit('reset')">恢复默认</button>
  </div>
</template>

<style scoped>
.fontset-panel {
  padding: var(--sp-exact-15) var(--sp-exact-10);
  background: var(--c-sunken);
}

.fontset-paste__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fontset-paste__row--second {
  margin-top: var(--sp-exact-10);
}

.fontset-paste__reset {
  width: calc(100% - var(--sp-3));
  height: var(--h-control-sm);
  margin-top: var(--sp-exact-10);
  border: 0;
  border-radius: var(--r-md);
  background: var(--c-input);
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  cursor: pointer;
}

.fontset-paste__reset:hover {
  background: var(--c-surface-raised);
}
</style>
