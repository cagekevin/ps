<script setup lang="ts">
const model = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    size?: 'small' | 'medium'
  }>(),
  { placeholder: '', size: 'medium' },
)

const emit = defineEmits<{ (e: 'clear'): void; (e: 'enter'): void; (e: 'blur'): void }>()

function clear() {
  model.value = ''
  emit('clear')
}
</script>

<template>
  <div class="g-input" :class="[`g-input--${size}`, { 'is-disabled': disabled }]">
    <slot name="prefix" />
    <input
      v-model="model"
      :placeholder="placeholder"
      :disabled="disabled"
      spellcheck="false"
      @keydown.enter="emit('enter')"
      @blur="emit('blur')"
    />
    <button
      v-if="clearable && model"
      class="g-input__clear"
      type="button"
      title="清空"
      @click="clear"
    >
      ×
    </button>
    <slot name="suffix" />
  </div>
</template>

<style scoped>
.g-input {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  /* 放在 flex 行里要能收缩：flex-basis 0 + min-width 0，
     否则按内容撑开，会把同一行的按钮挤出可视区 */
  flex: 1 1 0;
  min-width: 0;
  /* 尺寸出口：页面需要不同规格时只改变量，不改这里的选择器 */
  height: var(--input-height, var(--h-control));
  margin-right: var(--input-margin-right, 0);
  border: 1px solid var(--c-input);
  border-radius: var(--input-radius, var(--r-md));
  background: var(--c-input);
  color: var(--text);
}

/* 尺寸档位同样走变量，页面设了 --input-height 就能覆盖 */
.g-input--small {
  height: var(--input-height, var(--h-control-sm));
  padding: 0 var(--sp-3);
}

.g-input--medium {
  height: var(--input-height, var(--h-control));
  padding: 0 var(--sp-4);
}

.g-input:hover,
.g-input:focus-within {
  border-color: var(--accent-soft);
}

.g-input.is-disabled {
  opacity: 0.5;
}

.g-input input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-size: var(--fs-md);
}

.g-input input::placeholder {
  color: var(--text-faint);
}

.g-input__clear {
  flex: 0 0 auto;
  width: var(--sp-6);
  height: var(--sp-6);
  padding: 0;
  border: 0;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--text-faint);
  font-size: var(--fs-lg);
  line-height: 1;
}

.g-input__clear:hover {
  background: var(--bg-active);
  color: var(--text);
}
</style>
