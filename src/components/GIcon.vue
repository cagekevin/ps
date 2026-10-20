<script setup lang="ts">
import Icon from './Icon.vue'
import type { IconSize } from './icon/size'

/**
 * 带尺寸预设的图标。预设与 Icon 共用一套阶梯（components/icon/size.ts）。
 * 新代码优先用它，语义比裸数字清楚。
 */
withDefaults(
  defineProps<{
    name: string
    size?: IconSize | string
    color?: string
    title?: string
    spin?: boolean
  }>(),
  { size: '1em' },
)
</script>

<template>
  <Icon :name="name" :size="size" :color="color" :title="title" :class="{ 'is-spin': spin }" />
</template>

<style scoped>
.is-spin {
  animation: g-icon-spin 0.9s linear infinite;
}

@keyframes g-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
