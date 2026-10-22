<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import { POSITION_GROUPS } from '../types'

/**
 * 位置九宫格（`.f-baseX` + 两组 `custom-svg`）。
 *
 * 原版：6 个 `iconwenanweizhi1..6` 一组，6 个 `iconwenanweizhi7,8,9,4,5,6` 另一组
 * —— **两组顺序不同，不要合并成一组**（`docs/页面/04-自定义.md:44`）。
 *
 * 这两组在原版是同一行里的两段（`mr6` 分隔），这里照原版顺序排成一行。
 */
defineProps<{
  modelValue: number
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>()

function pick(position: number) {
  emit('update:modelValue', position)
}
</script>

<template>
  <div class="custom-positions">
    <template v-for="(group, groupIndex) in POSITION_GROUPS" :key="groupIndex">
      <button
        v-for="item in group"
        :key="`${groupIndex}-${item.icon}-${item.position}`"
        class="custom-positions__icon"
        :class="{ 'is-active': item.position === modelValue }"
        type="button"
        :aria-label="`位置 ${item.position + 1}`"
        :aria-pressed="item.position === modelValue"
        @click="pick(item.position)"
      >
        <Icon :name="item.icon" size="sm" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.custom-positions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

/* 原版 .custom-svg{color:#ddd} —— 落到 token，不写裸色 */
.custom-positions__icon {
  display: inline-flex;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-custom-svg);
  cursor: pointer;
}

.custom-positions__icon.is-active {
  color: var(--accent);
}
</style>
