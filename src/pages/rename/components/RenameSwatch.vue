<script setup lang="ts">
import Icon from '@/components/Icon.vue'

/**
 * 色块按钮（图层颜色标记）。
 *
 * 原版 `.colorButton`（app.v4.js:56727，样式见 app.bf68b505.css 的 data-v-2d612e86 块：
 * `width/height:calc(12.5vw - 11.875px);max:24px;border-radius:5px`，`hover{opacity:.8}`）；
 * 清除色块 `.colorButton-lastOne`（:56741）多一条 `border:1px solid #535353` + 居中图标。
 *
 * 已批准的新控件（`USER APPROVED PAGE: /rename` /「同意新增 色块按钮」）。
 * 颜色由调用方传 token 字符串（`var(--c-layer-1)`），组件只负责盒子，不定义色值。
 */
const props = defineProps<{
  title: string
  /** 传 `var(--c-layer-N)` 这类 token 字符串；清除色块不传 */
  color?: string
  /** 清除色块：描边 + 中间一个 ✕ */
  clear?: boolean
}>()

defineEmits<{ (e: 'pick'): void }>()
</script>

<template>
  <button
    class="rename-swatch"
    :class="{ 'rename-swatch--clear': props.clear }"
    type="button"
    :title="props.title"
    :style="props.color ? { backgroundColor: props.color } : undefined"
    @click="$emit('pick')"
  >
    <Icon v-if="props.clear" name="#iconguanbi" size="2xs" />
  </button>
</template>

<style scoped>
/* 原版 .colorButton —— 24×24 上限、圆角 5px；项间距交给父级 gap，不用 margin-right */
.rename-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(12.5vw - 11.875px);
  height: calc(12.5vw - 11.875px);
  max-width: 24px;
  max-height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--r-input);
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease);
}

/* 原版 .colorButton:hover{opacity:.8} */
.rename-swatch:hover {
  opacity: 0.8;
}

/* 原版 .colorButton-lastOne{border:1px solid #535353;line-height:1em;text-align:center} */
.rename-swatch--clear {
  border: 1px solid var(--c-swatch-border);
  background: transparent;
  color: var(--text);
}
</style>
