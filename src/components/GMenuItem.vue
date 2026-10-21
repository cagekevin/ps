<script setup lang="ts">
import { computed, inject } from 'vue'
import { G_MENU_KEY } from './GMenu.vue'

const props = defineProps<{
  value: string | number
  disabled?: boolean
}>()

const menu = inject(G_MENU_KEY, null)
const isActive = computed(() => menu?.active.value === props.value)

function onClick() {
  if (props.disabled) return
  menu?.select(props.value)
}
</script>

<template>
  <div
    class="g-menu-item"
    :class="{ 'is-active': isActive, 'is-disabled': disabled }"
    role="menuitem"
    @click="onClick"
  >
    <slot>{{ value }}</slot>
  </div>
</template>

<style scoped>
.g-menu-item {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  height: var(--h-control);
  padding: 0 var(--sp-5);
  color: var(--text-strong);
  font-size: var(--fs-md);
  cursor: pointer;
  white-space: nowrap;
}

/* 原版 .font-manager__menu>div:hover{background-color:hsla(0,0%,100%,.1)} */
.g-menu-item:hover {
  background: var(--c-hover-2);
}

.g-menu-item.is-active {
  color: var(--accent-soft);
}

.g-menu-item.is-disabled {
  opacity: 0.4;
  cursor: default;
}

.g-menu-item.is-disabled:hover {
  background: transparent;
}
</style>
