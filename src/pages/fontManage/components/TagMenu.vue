<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { FontTag } from '@/cep/types'
import Icon from '@/components/Icon.vue'

/**
 * 右键字体行弹出的标签菜单，对应原版 list-item 的 contextmenu → tagToFont。
 * 用 fixed 定位到鼠标位置，避免被列表容器裁掉。
 */
const props = defineProps<{
  visible: boolean
  x: number
  y: number
  tags: FontTag[]
  /** 该字体已属于哪些标签 */
  active: string[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'toggle', tag: string): void
}>()

const menuRef = ref<HTMLElement>()

function close() {
  emit('update:visible', false)
}

function onDocClick(event: MouseEvent) {
  if (!props.visible) return
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})

// 菜单可能超出面板底部，往上翻
const top = ref(props.y)
watch(
  () => props.visible,
  (value) => {
    if (!value) return
    const height = props.tags.length * 28 + 12
    top.value = Math.min(props.y, window.innerHeight - height - 8)
  },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="tag-menu"
      :style="{ left: `${x}px`, top: `${top}px` }"
    >
      <div class="tag-menu__title">打标签</div>
      <div
        v-for="tag in tags"
        :key="tag.text"
        class="tag-menu__item"
        @click="emit('toggle', tag.text)"
      >
        <Icon v-if="active.includes(tag.text)" name="icongouxuan" :size="12" class="tag-menu__check" />
        <span>{{ tag.text }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tag-menu {
  position: fixed;
  z-index: var(--z-dropdown);
  min-width: 120px;
  padding: var(--sp-3) 0;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}

.tag-menu__title {
  padding: 0 var(--sp-5) var(--sp-2);
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

.tag-menu__item {
  position: relative;
  padding: 0 var(--sp-5) 0 var(--sp-7);
  height: var(--h-control);
  display: flex;
  align-items: center;
  color: var(--text-strong);
  font-size: var(--fs-md);
  cursor: pointer;
  white-space: nowrap;
}

.tag-menu__item:hover {
  background: var(--bg-raise);
}

.tag-menu__check {
  position: absolute;
  left: var(--sp-5);
}
</style>
