<script setup lang="ts">
import NewSpin from '@/components/NewSpin.vue'
import { useLoadingStore } from '@/stores/loading'

const store = useLoadingStore()
</script>

<template>
  <div v-if="store.active" class="global-loading" role="status" aria-live="polite">
    <NewSpin :show="true" mask :tip="store.message" />
  </div>
</template>

<style scoped>
.global-loading {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--c-mask);
}
</style>
