<script setup lang="ts">
/** 原版 baseRadio：同一 v-model 下按 label 选中 */
const props = withDefaults(
  defineProps<{ label: string | number; title?: string; disabled?: boolean }>(),
  {},
)

const model = defineModel<string | number>({ default: '' })
</script>

<template>
  <label class="fontset-radio" :class="{ 'is-disabled': props.disabled }" :title="props.title">
    <input
      v-model="model"
      class="fontset-radio__input"
      type="radio"
      :value="props.label"
      :disabled="props.disabled"
    />
    <span class="fontset-radio__dot" />
    <span class="fontset-radio__text"><slot /></span>
  </label>
</template>

<style scoped>
.fontset-radio {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
  user-select: none;
}

.fontset-radio__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.fontset-radio__dot {
  display: inline-flex;
  width: var(--icon-xs);
  height: var(--icon-xs);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-pill);
  background: var(--c-sunken);
}

.fontset-radio__input:checked + .fontset-radio__dot {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 2px var(--c-sunken);
  background: var(--accent);
}

.fontset-radio__input:focus-visible + .fontset-radio__dot {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.fontset-radio.is-disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
