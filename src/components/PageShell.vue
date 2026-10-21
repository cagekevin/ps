<script setup lang="ts">
/**
 * 页面骨架。所有列表页都用它，别自己再写一遍 header + toolbar + 滚动区。
 * 结构：标题栏 / 工具条（搜索、筛选、标签）/ 内容区（可滚动）
 */
withDefaults(
  defineProps<{
    title: string
    /** 右上角计数，如 "259" */
    count?: string | number
  }>(),
  {},
)
</script>

<template>
  <div class="shell">
    <header class="shell__header">
      <h1>{{ title }}</h1>
      <span v-if="count !== undefined && count !== ''" class="shell__count">{{ count }}</span>
      <slot name="extra" />
    </header>

    <div v-if="$slots.toolbar" class="shell__toolbar">
      <slot name="toolbar" />
    </div>

    <div class="shell__body u-fill u-stack">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="shell__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg);
}

.shell__header {
  flex: 0 0 auto;
  height: var(--page-header-height, var(--h-header));
  padding: 0 var(--page-pad-x);
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  background: var(--c-header);
  border-bottom: 1px solid var(--border);
}

/* 原版 .tabs__nav__bar{font-size:12px;font-weight:500;color:#f5f5f5} */
h1 {
  position: relative;
  height: 100%;
  margin: 0;
  flex: 1;
  /* 必须 min-width:0，否则会把右侧按钮挤出容器 */
  min-width: 0;
  display: flex;
  align-items: center;
  color: var(--c-text-strong);
  font-size: var(--fs-md);
  font-weight: 500;
}

/* 原版 .tabs__nav__bar--active:after{width:18px;height:2px;background:#006fff;
   left:50%;transform:translateX(-9px)} —— 居中，不是靠左 */
h1::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 18px;
  height: 2px;
  margin-left: -9px;
  background: var(--accent);
}

.shell__count {
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

/* 左右留白统一在这里给，页面里的区块不要再写 padding-left/right */
.shell__toolbar {
  flex: 0 0 auto;
  padding: 0 var(--page-pad-x);
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
}

/* 布局交给 u-fill / u-stack，这里只管溢出 */
.shell__body {
  overflow: hidden;
}

.shell__footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  height: 30px;
  padding: 0 var(--page-pad-x);
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
}
</style>
