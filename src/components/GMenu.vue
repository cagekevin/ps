<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue'

export interface GMenuContext {
  active: ComputedRef<string | number | undefined>
  select: (value: string | number) => void
}

export const G_MENU_KEY: InjectionKey<GMenuContext> = Symbol('g-menu')
</script>

<script setup lang="ts">
import { computed, provide } from 'vue'

const model = defineModel<string | number>()
const emit = defineEmits<{ (e: 'select', value: string | number): void }>()

const active = computed(() => model.value)

provide(G_MENU_KEY, {
  active,
  select(value: string | number) {
    model.value = value
    emit('select', value)
  },
})
</script>

<template>
  <div class="g-menu">
    <slot />
  </div>
</template>

<style scoped>
.g-menu {
  min-width: 120px;
  padding: var(--sp-3) 0;
  border-radius: var(--r-md);
  background: transparent;
}
</style>
