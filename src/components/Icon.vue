<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { hasIcon } from './icon/names'
import { toPx, type IconSize } from './icon/size'
import { getSymbol } from './icon/sprite'

/**
 * 图标。名字对应原面板 sprite 里的 symbol id，可以带 # 前缀（兼容模板里的 #iconxxx）。
 *
 * **默认 1em，跟随字号**——原版 `.icon{width:1em;height:1em}` 就是这个行为。
 * 大多数地方不用传 size。需要覆盖时才传预设名（xs/sm/md/lg…）。
 * 见 docs/视觉规范.md。
 *
 * 实现上**不用 `<use href="#id">`**：在旧版 Chromium（CEP 12 是 99）里，
 * `<use>` 会在父级重绘时重新解析 symbol，表现为图标闪一下。
 * 这里直接取 symbol 的内部路径内联渲染，没有引用解析过程，就不会闪。
 */
const props = withDefaults(
  defineProps<{
    name: string
    size?: IconSize | number | string
    color?: string
    title?: string
  }>(),
  { size: '1em' },
)

const id = computed(() => props.name.replace(/^#/, ''))
const px = computed(() => toPx(props.size))
const symbol = computed(() => getSymbol(id.value))

watchEffect(() => {
  if (!hasIcon(id.value)) console.warn(`[Icon] 图标不存在：${id.value}`)
})
</script>

<template>
  <svg
    class="psz-icon"
    :viewBox="symbol?.viewBox ?? '0 0 24 24'"
    :style="{ width: px, height: px, color }"
    :title="title"
    aria-hidden="true"
    v-html="symbol?.inner"
  />
</template>

<style scoped>
.psz-icon {
  display: inline-block;
  flex: 0 0 auto;
  vertical-align: middle;
  fill: currentColor;
}
</style>
