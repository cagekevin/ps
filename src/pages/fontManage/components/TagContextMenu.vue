<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import GMenu from '@/components/GMenu.vue'
import GMenuItem from '@/components/GMenuItem.vue'

/**
 * 标签右键菜单。对应原版 font-manage__tag-group__context-menu。
 * 内容形态复用 GMenu / GMenuItem，这里只负责「定位到鼠标位置」和「点外部关闭」。
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

const menuRef = ref<HTMLElement>()
const top = ref(props.y)

function close() {
  emit('update:visible', false)
}

function onSelect(value: string | number) {
  close()
  if (value === 'rename') emit('rename')
  else if (value === 'remove') emit('remove')
}

function onDocDown(event: MouseEvent) {
  if (!props.visible) return
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.visible,
  (value) => {
    if (!value) return
    top.value = Math.min(props.y, window.innerHeight - 90)
  },
)

onMounted(() => {
  document.addEventListener('mousedown', onDocDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" ref="menuRef" class="tcm" :style="{ left: `${x}px`, top: `${top}px` }">
      <GMenu @select="onSelect">
        <GMenuItem value="rename">重命名</GMenuItem>
        <GMenuItem value="remove">删除</GMenuItem>
      </GMenu>
    </div>
  </Teleport>
</template>

<style scoped>
/* 只负责浮层外观，菜单项样式来自 GMenu / GMenuItem */
.tcm {
  position: fixed;
  z-index: var(--z-dropdown);
  min-width: 100px;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}
</style>
