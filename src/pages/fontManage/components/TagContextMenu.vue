<script setup lang="ts">
import { ref } from 'vue'
import { usePointPopover } from '@/composables/usePointPopover'

/**
 * 官方 font-manage-user-tag-overlay（app.v4.js:44546-44585）：
 * 右键标签弹出的 105px 蓝色浮层，只有「删除 / 重命名」两项。
 *
 * 定位/点外部关闭统一走 usePointPopover；不再用 GMenu 的深色菜单皮肤。
 */
const props = defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'rename'): void
  (e: 'remove'): void
}>()

function close() {
  emit('update:visible', false)
}

const menuRef = ref<HTMLElement | null>(null)
const { style: positionStyle } = usePointPopover({
  visible: () => props.visible,
  x: () => props.x,
  y: () => props.y,
  close,
  floating: menuRef,
})

function onRemove() {
  close()
  emit('remove')
}

function onRename() {
  close()
  emit('rename')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" ref="menuRef" class="font-manage__user-tag-overlay" :style="positionStyle">
      <div @click.stop="onRemove">删除</div>
      <div @click.stop="onRename">重命名</div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 原版 app.bf68b505.css: width:105px; padding:6px 12px; background:#3565ff */
.font-manage__user-tag-overlay {
  width: 105px;
  padding: 6px 12px;
  background: var(--c-accent-solid);
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  line-height: 20px;
  cursor: pointer;
}
</style>
