<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 原面板的 dropDowncom（anon_56d7_L30774）——被 12 个组件直接引用。
 * 这里只做最小实现：触发器 + 浮层 + 点外面关闭。
 */
withDefaults(defineProps<{ placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' }>(), {
  placement: 'bottom-start',
})

const visible = defineModel<boolean>('visible', { default: false })
const root = ref<HTMLElement>()

function onDocMouseDown(e: MouseEvent) {
  if (!visible.value) return
  if (root.value && !root.value.contains(e.target as Node)) visible.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') visible.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="g-dropdown">
    <div class="g-dropdown__trigger" @click="visible = !visible">
      <slot name="trigger" :visible="visible" />
    </div>
    <transition name="slide-down">
      <div v-if="visible" class="g-dropdown__panel" :class="`is-${placement}`">
        <slot :close="() => (visible = false)" />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.g-dropdown {
  position: relative;
  display: inline-block;
}

.g-dropdown__trigger {
  display: inline-flex;
}

.g-dropdown__panel {
  position: absolute;
  z-index: var(--z-dropdown);
  min-width: 100%;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}

.is-bottom-start {
  top: calc(100% + var(--sp-2));
  left: 0;
}

.is-bottom-end {
  top: calc(100% + var(--sp-2));
  right: 0;
}

.is-top-start {
  bottom: calc(100% + var(--sp-2));
  left: 0;
}

.is-top-end {
  bottom: calc(100% + var(--sp-2));
  right: 0;
}

/* 过渡用 styles/motion.css 里的 .slide-down，不在这里重复定义 */
</style>
