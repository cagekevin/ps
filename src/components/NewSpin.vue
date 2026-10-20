<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number
    tip?: string
    show?: boolean
    /** 盖一层半透明遮罩，用于局部加载 */
    mask?: boolean
  }>(),
  { size: 18, show: true, mask: false },
)
</script>

<template>
  <div v-if="show" class="g-spin" :class="{ 'is-mask': mask }">
    <span class="g-spin__ring" :style="{ width: `${size}px`, height: `${size}px` }" />
    <span v-if="tip" class="g-spin__tip">{{ tip }}</span>
  </div>
</template>

<style scoped>
.g-spin {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  padding: var(--sp-6);
  color: var(--text-dim);
  font-size: var(--fs-md);
}

.g-spin.is-mask {
  position: absolute;
  inset: 0;
  background: var(--c-float);
}

.g-spin__ring {
  display: block;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: g-spin-rotate 0.8s linear infinite;
}

@keyframes g-spin-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
