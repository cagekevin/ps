<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { hasIcon } from './icon/names'

/**
 * 原面板有两套图标：SVG sprite（baseIcon）和 gdaicon 字体。
 * 字体文件没随扩展分发（要联网拉 CDN），所以能映射到 sprite 的优先走 sprite，
 * 映射不到才退回 <i class="gdaicon gdaicon-xxx">，保证不会白块。
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

const id = computed(() => props.name.replace(/^#/, '').replace(/^gdaicon-/, ''))
const mapped = computed(() => hasIcon(id.value))
const fontSize = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <Icon v-if="mapped" :name="id" :size="size" :color="color" :title="title" />
  <i
    v-else
    class="gdaicon"
    :class="`gdaicon-${id}`"
    :style="{ fontSize, color }"
    :title="title"
    aria-hidden="true"
  />
</template>

<style scoped>
.gdaicon {
  display: inline-block;
  line-height: 1;
  font-style: normal;
}
</style>
