<script setup lang="ts">
/**
 * 段选（官方 `.switch-wrap` / `.switch-shape`，CSS 字符位置 106735：外框 38 高、滑块 24、圆角 5）。
 *
 * 两处用它：
 * 1. `comexport` 的 JPG/PNG 格式切换（T-88b）；
 * 2. `/commonUse` 顶部「放大 ▾」「缩小 ▾」胶囊（T-88a）——官方截图里是"文字 + 下拉箭头"，
 *    点开是否弹选项**未实测**，所以只有一个选项时按钮不响应（不假装是下拉）。
 *
 * 选中态：底 `--accent`、字 `--c-text-inverse`（用户 2026-10-23 定案"底 #006fff、字白"）。
 * 尺寸全部走变量出口，页面不写裸值。
 */
withDefaults(
  defineProps<{
    modelValue: string | number
    options: ReadonlyArray<{ value: string | number; label: string }>
    /** 右侧下拉箭头（官方「放大 ▾」的形态） */
    chevron?: boolean
    /** 无障碍名；不传则由选项文字拼接 */
    ariaLabel?: string
  }>(),
  { chevron: false, ariaLabel: '' },
)

defineEmits<{ (e: 'update:modelValue', value: string | number): void }>()
</script>

<template>
  <div class="g-segment" role="radiogroup" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="option.value"
      class="g-segment__item"
      :class="{ 'is-active': option.value === modelValue }"
      type="button"
      role="radio"
      :aria-checked="option.value === modelValue"
      :disabled="options.length < 2"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
      <span v-if="chevron" class="g-segment__chevron" aria-hidden="true">▾</span>
    </button>
  </div>
</template>

<style scoped>
.g-segment {
  display: inline-flex;
  height: var(--g-segment-height, var(--h-field));
  align-items: center;
  border-radius: var(--g-segment-radius, var(--r-input));
  background: var(--c-sunken);
  overflow: hidden;
}

.g-segment__item {
  display: inline-flex;
  height: 100%;
  align-items: center;
  gap: var(--sp-1);
  padding: 0 var(--sp-4);
  border: none;
  background: transparent;
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.g-segment__item.is-active {
  background: var(--accent);
  color: var(--c-text-inverse);
}

/* 只有一个选项时是"当前值展示"，不假装可点 */
.g-segment__item:disabled {
  cursor: default;
}

.g-segment__chevron {
  font-size: var(--fs-sm);
  line-height: 1;
}
</style>
