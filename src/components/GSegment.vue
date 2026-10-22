<script setup lang="ts">
/**
 * 单选段条（用户批准的「单选段条」）。
 *
 * 原版 `.switch-wrap` + `.switch-shape`（`/custom` 形状三选一、`/commonUse` JPG/PNG）：
 * - 段高 24px，圆角 5px，段底色透明，容器底 `#282828`
 * - 段宽 33.3%（三段时）
 *
 * 为什么不能复用 `MultiTabs`：那是**多选**语义（ctrl 切换、默认提示「ctrl+点击同时显示」），
 * 单选套上去是语义错位。选型见 `docs/组件库/页面契约.md` C-4。
 */
const props = defineProps<{
  modelValue: number
  labels: readonly string[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>()

function pick(index: number) {
  if (index === props.modelValue) return
  emit('update:modelValue', index)
}
</script>

<template>
  <div class="g-segment" role="radiogroup">
    <button
      v-for="(label, index) in labels"
      :key="index"
      class="g-segment__cell"
      :class="{ 'is-active': index === modelValue }"
      type="button"
      role="radio"
      :aria-checked="index === modelValue"
      @click="pick(index)"
    >
      {{ label }}
    </button>
  </div>
</template>

<style scoped>
.g-segment {
  display: flex;
  width: 100%;
  height: var(--h-control-sm);
  align-items: center;
  justify-content: center;
  padding: 0 0 0 var(--sp-exact-10);
  border-radius: var(--r-input);
  background: var(--c-tabsbar);
}

.g-segment__cell {
  flex: 1 1 0;
  min-width: 0;
  height: var(--h-control-sm);
  padding: 0 var(--sp-exact-12);
  border: 0;
  border-radius: var(--r-input);
  background: transparent;
  color: var(--text);
  font-size: var(--fs-md);
  line-height: var(--h-control-sm);
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
}

.g-segment__cell.is-active {
  /* UNVERIFIED: 原版 `.switch-shape` 没有选中态规则（`04-自定义.md:60`），
     选中表现未提取。这里只用文字色区分，不加底色，避免编造原版没有的样式。 */
  color: var(--text-strong);
}
</style>
