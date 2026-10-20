<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    content: string
    placement?: 'top' | 'bottom'
    delay?: number
  }>(),
  { placement: 'top', delay: 120 },
)

const show = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function open() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    show.value = true
  }, props.delay)
}

function close() {
  if (timer) clearTimeout(timer)
  show.value = false
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <span class="g-tooltip" @mouseenter="open" @mouseleave="close" @focusin="open" @focusout="close">
    <slot />
    <transition name="fade">
      <span v-if="show" class="g-tooltip__content" :class="`is-${placement}`" role="tooltip">
        {{ content }}
      </span>
    </transition>
  </span>
</template>

<style scoped>
.g-tooltip {
  position: relative;
  display: inline-flex;
}

.g-tooltip__content {
  position: absolute;
  z-index: var(--z-tooltip);
  left: 50%;
  transform: translateX(-50%);
  max-width: 220px;
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-md);
  background: var(--c-float);
  border: 1px solid var(--c-border-float);
  box-shadow: var(--shadow-pop);
  color: var(--text-strong);
  font-size: var(--fs-sm);
  line-height: 1.5;
  white-space: nowrap;
  pointer-events: none;
}

.is-top {
  bottom: calc(100% + var(--sp-3));
}

.is-bottom {
  top: calc(100% + var(--sp-3));
}

/* 过渡用 styles/motion.css 里的 .fade，不在这里重复定义 */
</style>
