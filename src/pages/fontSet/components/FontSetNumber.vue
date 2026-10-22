<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import type { IconSize } from '@/components/icon/size'
import { parseNumericText } from '@/utils/number'

/**
 * 原版 `baseInputMore` + 前面的拖拽图标。
 *
 * 结构（app.v4.js:40833-40844）：
 *   `[baseSvg 拖拽图标] [baseInputMore: 输入框 + 单位 + 预设箭头]`
 * 拖拽图标在**输入框外面左侧**，不是嵌在深色框里。
 */
const props = withDefaults(
  defineProps<{
    modelValue: string | number
    icon?: string
    iconSize?: IconSize
    title?: string
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    suffix?: string
    /** 是否显示预设箭头（原版 baseInputMore 的 handle） */
    preset?: boolean
  }>(),
  { step: 1, iconSize: 'lg' },
)

const emit = defineEmits<{
  (e: 'commit', value: number): void
  (e: 'preset'): void
}>()

const text = ref(String(props.modelValue ?? ''))
const focused = ref(false)

watch(
  () => props.modelValue,
  (value) => {
    text.value = String(value ?? '')
  },
)

function clamp(value: number): number {
  if (props.min !== undefined && value < props.min) return props.min
  if (props.max !== undefined && value > props.max) return props.max
  return value
}

function parse(): number {
  return clamp(parseNumericText(text.value))
}

function commit() {
  const value = parse()
  text.value = String(value)
  emit('commit', value)
}

function onBlur() {
  focused.value = false
  commit()
}

function stepBy(direction: number) {
  text.value = String(clamp(parse() + direction * (props.step || 1)))
  commit()
}

function onWheel(event: WheelEvent) {
  if (!focused.value || props.disabled) return
  event.preventDefault()
  stepBy(event.deltaY < 0 ? 1 : -1)
}

let dragStartX = 0
let dragStartValue = 0
let dragging = false

function onMouseMove(event: MouseEvent) {
  if (!dragging) return
  text.value = String(clamp(dragStartValue + (event.clientX - dragStartX) * (props.step || 1)))
}

function cancelDrag() {
  dragging = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', stopDrag)
}

function stopDrag() {
  if (!dragging) return
  cancelDrag()
  commit()
}

function startDrag(event: MouseEvent) {
  if (props.disabled) return
  dragging = true
  dragStartX = event.clientX
  dragStartValue = parse()
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', stopDrag)
}

// 拖到一半组件被卸载时不能留 document 监听，也不要在卸载时触发 commit
onBeforeUnmount(cancelDrag)
</script>

<template>
  <div class="fontset-number" :class="{ 'is-disabled': disabled }" :title="title">
    <span
      v-if="icon"
      class="fontset-number__grip"
      title="左右拖动调整"
      @mousedown.prevent="startDrag"
    >
      <Icon :name="icon" :size="iconSize" />
    </span>

    <span class="fontset-number__box">
      <input
        v-model="text"
        class="fontset-number__input"
        type="text"
        inputmode="decimal"
        :disabled="disabled"
        @focus="focused = true"
        @blur="onBlur"
        @keydown.enter.prevent="commit"
        @wheel="onWheel"
      />
      <span v-if="suffix" class="fontset-number__suffix">{{ suffix }}</span>
      <button
        v-if="preset"
        class="fontset-number__caret"
        type="button"
        title="预设"
        @click.stop="emit('preset')"
      >
        <Icon name="#iconxiala" size="2xs" />
      </button>
    </span>
  </div>
</template>

<style scoped>
.fontset-number {
  display: flex;
  min-width: 0;
  height: var(--h-control-sm);
  align-items: center;
}

.fontset-number.is-disabled {
  opacity: 0.45;
}

.fontset-number__grip {
  display: inline-flex;
  flex: 0 0 auto;
  margin-right: var(--sp-2);
  color: var(--text-dim);
  cursor: w-resize;
}

.fontset-number__grip:hover {
  color: var(--text-strong);
}

.fontset-number__box {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-2);
  /* 原版 .base-input{background:#222;border:1px solid transparent;border-radius:5px} */
  border: 1px solid transparent;
  border-radius: var(--r-input);
  background: var(--c-font-input);
  color: var(--text);
}

.fontset-number__input {
  flex: 1;
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: var(--fs-md);
  text-align: center;
}

.fontset-number__suffix {
  flex: 0 0 auto;
  color: var(--text-dim);
  font-size: var(--fs-xs);
}

.fontset-number__caret {
  display: inline-flex;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
}

.fontset-number__caret:hover {
  color: var(--text-strong);
}
</style>
