<script setup lang="ts">
/** 原面板的 GButton / Button 是同一个东西，这里合成一个 */
withDefaults(
  defineProps<{
    type?: 'default' | 'primary' | 'danger' | 'text'
    size?: 'small' | 'medium'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  { type: 'default', size: 'medium' },
)

defineEmits<{ (e: 'click', ev: MouseEvent): void }>()
</script>

<template>
  <button
    class="g-btn"
    :class="[`g-btn--${type}`, `g-btn--${size}`, { 'is-block': block, 'is-loading': loading }]"
    :disabled="disabled || loading"
    type="button"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="g-btn__spin" />
    <slot />
  </button>
</template>

<style scoped>
.g-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  border: 1px solid var(--bg-raise);
  border-radius: var(--r-md);
  background: var(--bg-raise);
  color: var(--text-strong);
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.g-btn--small {
  height: var(--h-control-sm);
  padding: 0 var(--sp-4);
  font-size: var(--fs-md);
}

.g-btn--medium {
  height: var(--h-control);
  padding: 0 var(--sp-5);
  font-size: var(--fs-md);
}

.g-btn:hover:not(:disabled) {
  background: var(--c-surface-raised-hover);
  border-color: var(--c-surface-raised-hover);
}

.g-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--c-text-inverse);
}

.g-btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.g-btn--danger {
  color: var(--danger);
  border-color: var(--c-danger-a16);
}

.g-btn--danger:hover:not(:disabled) {
  background: var(--c-danger-a16);
  border-color: var(--danger);
}

.g-btn--text {
  background: transparent;
  border-color: transparent;
  color: var(--text-dim);
}

.g-btn--text:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}

.g-btn.is-block {
  display: flex;
  width: 100%;
}

.g-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.g-btn__spin {
  width: var(--sp-5);
  height: var(--sp-5);
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: var(--r-pill);
  animation: g-btn-spin 0.7s linear infinite;
}

@keyframes g-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
