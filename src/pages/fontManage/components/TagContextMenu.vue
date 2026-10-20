<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * 标签右键菜单。对应原版 font-manage__tag-group__context-menu。
 * 只有两项：重命名 / 删除。
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
      <div class="tcm__item" @click="emit('rename')">重命名</div>
      <div class="tcm__item" @click="emit('remove')">删除</div>
    </div>
  </Teleport>
</template>

<style scoped>
.tcm {
  position: fixed;
  z-index: var(--z-dropdown);
  min-width: 100px;
  padding: var(--sp-3) 0;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}

.tcm__item {
  height: var(--h-control);
  padding: 0 var(--sp-5);
  display: flex;
  align-items: center;
  color: var(--c-text-strong);
  font-size: var(--fs-md);
  cursor: pointer;
  white-space: nowrap;
}

.tcm__item:hover {
  background: var(--c-surface-raised);
}
</style>
