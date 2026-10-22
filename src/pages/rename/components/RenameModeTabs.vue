<script setup lang="ts">
/**
 * 顶部分段切换（默认 / 替换）。
 *
 * 原版结构（app.v4.js:56483-56497）：`.top-switch` 37px + `#282828`，
 * 每项 `.switch-text`（12px、高 25px、透明 2px 边框），
 * 选中项加 `.switch-context-boder`（下边框 `#006fff`，见 app.bf68b505.css 的 data-v-2d612e86 块）。
 *
 * 已批准的新控件（`USER APPROVED PAGE: /rename` /「同意新增 分段切换」）。
 * 只做"给定若干段 + 当前下标"，不放业务。
 */
const props = defineProps<{
  modes: string[]
  modelValue: number
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>()
</script>

<template>
  <div class="rename-tabs">
    <button
      v-for="(mode, index) in props.modes"
      :key="mode"
      class="rename-tabs__item"
      :class="{ 'is-active': index === props.modelValue }"
      type="button"
      :title="mode"
      @click="emit('update:modelValue', index)"
    >
      {{ mode }}
    </button>
    <span class="rename-tabs__spacer" />
    <slot name="extra" />
  </div>
</template>

<style scoped>
/* 原版 .top-switch{width:100%;height:37px;background:#282828;padding:0 20px}
   （20px 不在间距阶梯上，照抄）。原版这条规则没有 border-bottom，这里也不加。 */
.rename-tabs {
  flex: none;
  display: flex;
  align-items: center;
  width: 100%;
  height: var(--h-tabs);
  padding: 0 20px;
  background: var(--c-tabsbar);
}

/* 原版 .switch-text{font-size:12px;height:25px;border:2px solid transparent} + .mr30
   —— 原版这条规则**不设 color**（继承顶条），所以这里也不写，别用 accent（那是下边框的颜色） */
.rename-tabs__item {
  display: flex;
  align-items: center;
  height: 25px;
  margin: 0 30px 0 0;
  padding: 0;
  border: 2px solid transparent;
  background: transparent;
  color: inherit;
  font-size: var(--fs-md);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease);
}

/* 原版 .switch-text:hover{color:#fff} */
.rename-tabs__item:hover {
  color: var(--c-text-inverse);
}

/* 原版 .switch-context-boder{border-bottom:2px solid #006fff} */
.rename-tabs__item.is-active {
  border-bottom-color: var(--c-accent);
}

.rename-tabs__spacer {
  flex: 1;
}
</style>
