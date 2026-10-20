<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { hasIcon } from './icon/names'

/**
 * 图标。名字对应原面板 sprite 里的 symbol id，可以带 # 前缀（兼容模板里的 #iconxxx）。
 * 原面板用法：<baseIcon name="#iconchuangjian" class="svg-14" />
 */
const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    color?: string
    title?: string
  }>(),
  { size: 16 },
)

const id = computed(() => props.name.replace(/^#/, ''))
const px = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))

watchEffect(() => {
  if (!hasIcon(id.value)) console.warn(`[Icon] 图标不存在：${id.value}`)
})
</script>

<template>
  <svg class="psz-icon" :style="{ width: px, height: px, color }" :title="title" aria-hidden="true">
    <use :href="`#${id}`" :xlink:href="`#${id}`" />
  </svg>
</template>

<style scoped>
.psz-icon {
  display: inline-block;
  flex: 0 0 auto;
  vertical-align: middle;
  fill: currentColor;
}
</style>
