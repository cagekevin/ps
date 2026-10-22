<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { usePopover } from '@/composables/usePopover'

export interface SelectBoxOption {
  id?: string | number
  label: string
}

/**
 * 原版 select-box（app.v4.js:55389-55439）：
 * 触发器显示当前项，展开后列表项左侧打勾。
 */
const props = defineProps<{
  options: SelectBoxOption[]
  modelValue: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'choose', value: number): void
}>()

const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const { open, style, close, toggle, onTriggerKeydown } = usePopover({
  placement: 'bottom-start',
  matchWidth: 'width',
  triggerRef,
  panelRef,
})

const currentLabel = computed(() => props.options[props.modelValue]?.label ?? '')

function choose(index: number) {
  emit('update:modelValue', index)
  emit('choose', index)
  close()
}
</script>

<template>
  <div class="select-box">
    <button
      ref="triggerRef"
      class="select-box__content"
      type="button"
      :disabled="disabled"
      :aria-expanded="open"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span>{{ currentLabel }}</span>
      <Icon name="#iconxiala" size="2xs" />
    </button>

    <div v-if="open" ref="panelRef" class="select-box__dropdown" :style="style">
      <button
        v-for="(option, index) in options"
        :key="option.id ?? index"
        class="select-box__item"
        :class="{ 'is-active': index === modelValue }"
        type="button"
        @click="choose(index)"
      >
        <Icon
          v-if="index === modelValue"
          class="select-box__check"
          name="#icongouxuan"
          size="2xs"
        />
        <span>{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.select-box {
  position: relative;
  width: 100%;
}

.select-box__content {
  display: flex;
  width: 100%;
  height: 28px;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-3);
  border: 0;
  border-radius: var(--r-input);
  background: var(--c-font-input);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.select-box__dropdown {
  position: absolute;
  top: 0;
  left: 0;
  z-index: var(--z-toast);
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-input);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}

.select-box__item {
  position: relative;
  display: flex;
  width: 100%;
  height: 28px;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-3) 0 var(--sp-6);
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: var(--fs-md);
  text-align: left;
  cursor: pointer;
}

.select-box__item:hover,
.select-box__item.is-active {
  background: var(--c-surface-active);
}

.select-box__check {
  position: absolute;
  left: var(--sp-2);
}
</style>
