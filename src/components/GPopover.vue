<script setup lang="ts">
import { ref } from 'vue'
import { usePopover } from '@/composables/usePopover'
import type { FloatingPlacement } from '@/composables/floating-position'

/**
 * 锚点浮层壳：只负责 trigger / panel / 开关 / 定位 / 关闭行为。
 * 内容、宽度、样式由调用方通过 slot 和 panelClass 决定。
 */
const props = withDefaults(
  defineProps<{
    placement?: FloatingPlacement
    offset?: number
    padding?: number
    matchWidth?: 'width' | 'min' | false
    role?: 'menu' | 'listbox' | 'dialog'
    disabled?: boolean
    closeOnOutside?: boolean
    closeOnEscape?: boolean
    panelClass?: string
  }>(),
  {
    placement: 'bottom-start',
    offset: 4,
    padding: 4,
    matchWidth: false,
    role: 'menu',
    disabled: false,
    closeOnOutside: true,
    closeOnEscape: true,
    panelClass: '',
  },
)

const open = defineModel<boolean>('open', { default: false })
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const { close, toggle, onTriggerKeydown } = usePopover({
  open,
  placement: props.placement,
  offset: props.offset,
  padding: props.padding,
  matchWidth: props.matchWidth,
  closeOnOutside: props.closeOnOutside,
  closeOnEscape: props.closeOnEscape,
  triggerRef,
  panelRef,
})

function onTriggerClick() {
  if (!props.disabled) toggle()
}

function onKeydown(event: KeyboardEvent) {
  if (!props.disabled) onTriggerKeydown(event)
}
</script>

<template>
  <div class="g-popover">
    <div
      ref="triggerRef"
      class="g-popover__trigger"
      :aria-expanded="open"
      :aria-haspopup="role"
      @click="onTriggerClick"
      @keydown="onKeydown"
    >
      <slot name="trigger" :open="open" />
    </div>

    <Teleport to="body">
      <transition name="slide-down">
        <div v-if="open" ref="panelRef" class="g-popover__panel" :class="panelClass" :role="role">
          <slot :close="close" />
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.g-popover {
  display: inline-block;
}

.g-popover__trigger {
  display: inline-flex;
  cursor: pointer;
}

.g-popover__panel {
  position: fixed;
  top: var(--floating-y, 0);
  left: var(--floating-x, 0);
  z-index: var(--z-dropdown);
  width: var(--floating-width, auto);
  min-width: var(--floating-min-width, auto);
  max-width: calc(100vw - var(--sp-4));
  max-height: calc(100vh - var(--sp-4));
  overflow: auto;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}
</style>
