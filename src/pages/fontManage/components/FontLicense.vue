<script setup lang="ts">
import { computed } from 'vue'
import { LICENSE_FREE_PATH, LICENSE_PAID_PATH } from './license-paths'

/**
 * 官方 font-manage-list-licence（app.v4.js:47262-47320）：
 * - 免费商用：45×15 绿色
 * - 需授权：56×15 橙色
 *
 * 只属于字体管理列表，不抽公共控件。
 * 名字加 `Font` 前缀：原版组件叫 `License`，但 ESLint 要求组件名多词
 * （`vue/multi-word-component-names`），改的是变量名，模板与样式都不动。
 */
const props = defineProps<{
  family: string
  commercials: string[]
}>()

const isFree = computed(() => props.commercials.includes(props.family))
</script>

<template>
  <span class="font-manage__list__license">
    <svg
      v-if="isFree"
      width="45"
      height="15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="免费商用"
    >
      <path :d="LICENSE_FREE_PATH" fill="#45BF74" />
      <rect x=".5" y=".5" width="43.35" height="14" rx="3.5" stroke="#45BF74" stroke-opacity=".4" />
    </svg>
    <svg
      v-else
      width="56"
      height="15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="商用授权"
    >
      <path :d="LICENSE_PAID_PATH" fill="#D58F28" />
      <rect x=".5" y=".5" width="54.08" height="14" rx="3.5" stroke="#D58F28" stroke-opacity=".4" />
    </svg>
  </span>
</template>

<style scoped>
.font-manage__list__license {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
}
</style>
