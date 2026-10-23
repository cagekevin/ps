<script setup lang="ts">
/**
 * 单选项（官方 `baseRadio`，`app.v4.js:2563` 的 `he.exports`，scope `6ad4ee70`）。
 *
 * 官方实测（`app.bf68b505.css` 字符位置 27077）：整行字号 12、圆圈 12×12、与文字右空 6、
 * 圆角 50%、边框 1px `#707070`；选中态是**换 svg 图标**。
 * 我们按用户定案：尺寸 12×12、**不做悬停变白**（官方有，判为无意义）；
 * 选中用强调色填充（与 `CheckBox` 一致，差额登记 D-51）。
 *
 * `v-model` 是"当前选中值"：同一组 `GRadio` 共享一个值，点击即写回。
 */
const model = defineModel<string | number>({ required: true })

const props = withDefaults(
  defineProps<{
    /** 本项的值 */
    value: string | number
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{ (e: 'change', value: string | number): void }>()

function select() {
  if (props.disabled || model.value === props.value) return
  model.value = props.value
  emit('change', props.value)
}
</script>

<template>
  <label class="g-radio" :class="{ 'is-disabled': disabled }">
    <button
      class="g-radio__dot"
      :class="{ 'is-checked': model === value }"
      type="button"
      role="radio"
      :aria-checked="model === value"
      :disabled="disabled"
      @click="select"
    />
    <span class="g-radio__label"><slot /></span>
  </label>
</template>

<style scoped>
.g-radio {
  display: inline-flex;
  align-items: center;
  gap: var(--g-radio-gap, var(--sp-3));
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.g-radio.is-disabled {
  opacity: 0.5;
  cursor: default;
}

.g-radio__dot {
  width: var(--g-radio-size, 12px);
  height: var(--g-radio-size, 12px);
  flex: none;
  padding: 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-pill);
  background: var(--c-sunken);
  cursor: inherit;
}

.g-radio__dot.is-checked {
  border-color: var(--accent);
  background: var(--accent);
}
</style>
