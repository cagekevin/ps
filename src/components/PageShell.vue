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
  padding: 0 var(--sp-4) 0 var(--sp-5);
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
}

h1 {
  margin: 0;
  flex: 1;
  color: var(--text-strong);
  font-size: var(--fs-lg);
  font-weight: 500;
}

.shell__count {
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

.shell__toolbar {
  flex: 0 0 auto;
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
  padding: 0 var(--sp-4);
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
}
</style>
