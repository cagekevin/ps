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
  /* 方框 12×12：原版 `.base-check div div` / `svg div` 宽高 12（`app.bf68b505.css` 字符位置
     19060；组件模块 `07ea` 在 `app.8565afb8.js`）。用户 2026-10-23 定「全仓 12×12」。
     不走 `--icon-sm`（14px）：那档被 FontSetIcon 等共用，改 token 会牵连别的控件。 */
  width: var(--checkbox-size, 12px);
  height: var(--checkbox-size, 12px);
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
