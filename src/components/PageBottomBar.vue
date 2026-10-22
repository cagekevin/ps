<script setup lang="ts">
import { ref } from 'vue'

/**
 * 页面底栏（26px 图标条）。
 *
 * 原版两页同一个形状：`.button-nav{width:100%;height:26px;background:#535353}`
 * （样式页 `app.bf68b505.css` 的 `data-v-7f4f5fe0` 段）与动作页 `.button-nav-wrap`（同值）。
 * 从 `pages/action/index.css` 的 `.action-bottom*` 上提：第二个页面要用就搬上来，不复制第二份。
 *
 * 插槽内容用 `.g-bottom-bar__icon` / `.g-bottom-bar__divider` 两个类，
 * 样式由本组件通过 `:slotted()` 提供——页面不许再写一份按钮皮肤。
 */
const root = ref<HTMLElement | null>(null)

/** 动作页用它给挂在上面的菜单定位（原版菜单挂在同一个底栏上） */
defineExpose({ root })
</script>

<template>
  <div ref="root" class="g-bottom-bar">
    <slot />
  </div>
</template>

<style scoped>
.g-bottom-bar {
  position: relative;
  display: flex;
  width: 100%;
  height: 26px;
  flex: 0 0 26px;
  align-items: center;
  gap: var(--sp-1);
  padding: 0 var(--sp-exact-10);
  background: var(--c-font-btn);
}

.g-bottom-bar :slotted(.g-bottom-bar__icon) {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.g-bottom-bar :slotted(.g-bottom-bar__icon:hover) {
  color: var(--text-strong);
}

.g-bottom-bar :slotted(.g-bottom-bar__icon:disabled) {
  cursor: not-allowed;
  opacity: 0.4;
}

.g-bottom-bar :slotted(.g-bottom-bar__divider) {
  width: 1px;
  height: 13px;
  margin: 0 var(--sp-1);
  background: var(--c-border);
}
</style>
