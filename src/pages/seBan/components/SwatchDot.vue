<script setup lang="ts">
/**
 * 色点（新控件，2026-10-24 用户批准「同意新增 色点」）。
 *
 * 圆形按钮：左键 emit `pick`（填充），右键 emit `outline`（描边）。
 * 组件**不调命令、不判智能填色开关**——开关与执行都在主面板（`docs/页面/11` §零·二）。
 *
 * 尺寸固定 14px：面板最窄只有一个圆的宽度，用百分比会在窄面板里缩成看不见。
 */
withDefaults(defineProps<{ color: string; label?: string }>(), { label: '' })

defineEmits<{ (e: 'pick'): void; (e: 'outline'): void }>()
</script>

<template>
  <button
    class="swatch-dot"
    type="button"
    :title="label"
    :aria-label="label"
    :style="{ '--dot-color': color }"
    @click="$emit('pick')"
    @contextmenu.prevent="$emit('outline')"
  />
</template>

<style scoped>
.swatch-dot {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 1px solid var(--c-border-float-strong);
  border-radius: 50%;
  background: var(--dot-color);
  cursor: pointer;
  transition: transform 0.12s;
}

.swatch-dot:hover {
  transform: scale(1.15);
}

.swatch-dot:focus-visible {
  outline: 1px solid var(--c-accent-solid);
  outline-offset: 1px;
}
</style>
