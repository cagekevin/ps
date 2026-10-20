<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFeedbackStore } from '@/stores/feedback'
import Icon from '@/components/Icon.vue'

const store = useFeedbackStore()
const { toasts } = storeToRefs(store)

const ICON: Record<string, string> = {
  ok: 'iconwancheng1',
  error: 'iconguanbi',
  warn: 'iconchongtutixing',
  info: 'iconxianshi',
}
</script>

<template>
  <Teleport to="body">
    <transition-group name="slide-up" tag="div" class="toast-host">
      <div
        v-for="item in toasts"
        :key="item.id"
        class="toast-item"
        :class="`is-${item.type}`"
        @click="store.dismiss(item.id)"
      >
        <Icon :name="ICON[item.type]" :size="13" class="toast-icon" />
        <span class="toast-text">{{ item.text }}</span>
      </div>
    </transition-group>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: var(--sp-6);
  transform: translateX(-50%);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  max-width: var(--toast-max-width, 280px);
  padding: var(--sp-3) var(--sp-5);
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-float);
  color: var(--text-strong);
  font-size: var(--fs-md);
  line-height: 1.4;
  pointer-events: auto;
  cursor: default;
}

.toast-icon {
  flex: 0 0 auto;
}

.toast-text {
  word-break: break-all;
}

.is-ok .toast-icon {
  color: var(--ok);
}

.is-error .toast-icon {
  color: var(--danger);
}

.is-warn .toast-icon {
  color: var(--warn);
}

.is-info .toast-icon {
  color: var(--accent-soft);
}

/* 过渡用 styles/motion.css 里的 .slide-up，不在这里重复定义 */
</style>
