<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { hasIcon } from './icon/names'
import { toPx, type IconSize } from './icon/size'

/**
 * 图标。名字对应原面板 sprite 里的 symbol id，可以带 # 前缀（兼容模板里的 #iconxxx）。
 *
 * size 优先用预设名（xs/sm/md/lg…），不要写裸数字 —— `npm run check` 会拦。
 * 见 docs/视觉规范.md。
 */
const props = withDefaults(
  defineProps<{
    name: string
    size?: IconSize | number
    color?: string
    title?: string
  }>(),
  { size: 'md' },
)

const id = computed(() => props.name.replace(/^#/, ''))
const px = computed(() => toPx(props.size))

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
