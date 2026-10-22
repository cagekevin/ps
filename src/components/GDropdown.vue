<script setup lang="ts">
import { ref } from 'vue'
import { usePopover } from '@/composables/usePopover'

/**
 * 原面板的 dropDowncom (anon_56d7_L30774)——被 12 个组件直接引用。
 *
 * 定位/翻转/夹取/点外部关闭统一走 `usePopover`；
 * 这里只保留 trigger + panel 结构和宽度出口。
 */
const props = withDefaults(
  defineProps<{ placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' }>(),
  {
    placement: 'bottom-start',
  },
)

const visible = defineModel<boolean>('visible', { default: false })
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const { close, toggle, onTriggerKeydown } = usePopover({
  open: visible,
  placement: props.placement,
  matchWidth: 'min',
  triggerRef,
  panelRef,
})
</script>

<template>
  <div class="g-dropdown">
    <div
      ref="triggerRef"
      class="g-dropdown__trigger"
      :aria-expanded="visible"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <slot name="trigger" :visible="visible" />
    </div>
    <transition name="slide-down">
      <div v-if="visible" ref="panelRef" class="g-dropdown__panel">
        <slot :close="close" />
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
  position: fixed;
  top: var(--floating-y, 0);
  left: var(--floating-x, 0);
  z-index: var(--z-dropdown);
  /* 宽度出口：默认跟触发器同宽；页面需要更宽时设 --dropdown-width */
  min-width: var(--floating-min-width, auto);
  width: var(--dropdown-width, auto);
  max-width: var(--dropdown-max-width, none);
  max-height: calc(100vh - var(--sp-4));
  overflow-y: auto;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}
</style>
