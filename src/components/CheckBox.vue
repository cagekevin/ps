<script setup lang="ts">
import { computed } from 'vue'

/** 原版 check-box：支持 checked / indeterminate / 禁用；标签走默认插槽 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    indeterminate?: boolean
    disabled?: boolean
    title?: string
  }>(),
  { indeterminate: false, disabled: false },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}>()

const checked = computed(() => props.modelValue && !props.indeterminate)

function toggle() {
  if (props.disabled) return
  const next = !props.modelValue
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<template>
  <label class="check-box" :class="{ 'is-disabled': disabled }" :title="title">
    <button
      class="check-box__box"
      :class="{ 'is-checked': checked, 'is-indeterminate': indeterminate }"
      type="button"
      role="checkbox"
      :aria-checked="indeterminate ? 'mixed' : modelValue"
      :disabled="disabled"
      @click="toggle"
    >
      <span v-if="indeterminate" class="check-box__dash" />
      <span v-else-if="checked" class="check-box__tick">✓</span>
    </button>
    <span class="check-box__label"><slot /></span>
  </label>
</template>

<style scoped>
.check-box {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.check-box.is-disabled {
  opacity: 0.5;
  cursor: default;
}

.check-box__box {
  display: inline-flex;
  width: var(--icon-sm);
  height: var(--icon-sm);
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-sm);
  background: var(--c-sunken);
  color: var(--text-strong);
  cursor: inherit;
}

.check-box__box.is-checked,
.check-box__box.is-indeterminate {
  border-color: var(--accent);
  background: var(--accent);
}

.check-box__tick {
  font-size: var(--fs-xs);
  line-height: 1;
}

.check-box__dash {
  width: var(--sp-2);
  height: 1px;
  background: var(--text-strong);
}

.check-box__label {
  line-height: var(--fs-md);
}
</style>
