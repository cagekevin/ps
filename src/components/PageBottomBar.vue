<script setup lang="ts">
import { ref } from 'vue'

/**
 * 页面底栏（26px 图标条）。
 *
 * 原版三页同一个形状，只有类名不同：
 * - 样式页 `.button-nav{width:100%;height:26px;background:#535353}`（`data-v-7f4f5fe0`）
 * - 动作页 `.button-nav-wrap{…同值}`（`data-v-7b3c2fb6`）
 * - 重命名页 `.reanme-bottom{…同值}`（`data-v-2d612e86`）
 *
 * 图标按钮规格来自原版 `.base-icon{width:26px;height:26px;border:1px solid transparent}`
 * 与 `.hover:hover,.hoverClick{background:#222;border-color:#444}`。
 *
 * **插槽内容的皮肤写在下面的非 scoped `<style>` 里**（`.g-bottom-bar__icon` 等）。
 * 为什么不是 `:slotted()`：它会被编译成 `.g-bottom-bar .g-bottom-bar__icon[data-v-xxx-s]`，
 * 只有本组件**直接渲染**的节点才带 `-s` 属性；动作页的导入/导出按钮在 `GDropdown` 的
 * `#trigger` 插槽里，由 `GDropdown` 渲染、拿不到 `-s` → 规则不命中 → 露浏览器默认按钮底色
 * （用户实测：白底）。改成全局类后选择器只要求"元素带这个类"，与它被渲染在几层插槽里无关。
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

<!-- 故意不 scoped：皮肤要能命中嵌套在 GDropdown / 其他子组件插槽里的按钮（见脚本里的说明） -->
<style>
.g-bottom-bar__icon {
  display: inline-flex;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  padding: 0;
  /* 原版 .base-icon[data-v-63c7852d]{border:1px solid transparent}，hover 才出现 #444 边 */
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

/* 原版 .hover:hover,.hoverClick{background-color:#222;border-color:#444} */
.g-bottom-bar__icon:hover:not(:disabled) {
  border-color: var(--c-icon-hover-border);
  background: var(--c-sunken);
}

.g-bottom-bar__icon:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.g-bottom-bar__icon:disabled:hover {
  border-color: transparent;
  background: transparent;
}

/* 原版 .verline{width:1px;height:13px;background-color:#333;border:none} */
.g-bottom-bar__divider {
  flex: 0 0 auto;
  width: 1px;
  height: 13px;
  margin: 0 var(--sp-1);
  background: var(--c-verline);
}
</style>

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
</style>
