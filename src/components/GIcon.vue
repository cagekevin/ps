<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'

/** 带尺寸预设的图标，对应原面板的 class="svg-9 / svg-14" 那套 */
const props = withDefaults(
  defineProps<{
    name: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    color?: string
    title?: string
    spin?: boolean
  }>(),
  { size: 'md' },
)

const PX: Record<string, number> = { xs: 10, sm: 14, md: 16, lg: 20 }
const px = computed(() => PX[props.size] ?? 16)
</script>

<template>
  <Icon :name="name" :size="px" :color="color" :title="title" :class="{ 'is-spin': spin }" />
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
