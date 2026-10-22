<script setup lang="ts">
import { list, type CommandGroup } from '@/commands'
import { useCommand } from './useCommand'

/**
 * 命令网格：按注册表渲染，**页面不写任何具体命令**。
 *
 * 存在的意义是验证架构：同一批命令既能被字体页按钮触发，
 * 也能从这里列出并执行——"一个操作两个入口"（plan P4c 判据）。
 */
const props = defineProps<{ group?: CommandGroup }>()

const entries = list({ group: props.group }).map((meta) => ({
  meta,
  runner: useCommand(meta.id),
}))

function run(item: (typeof entries)[number]) {
  void item.runner.run(undefined, `已执行：${item.meta.title}`)
}
</script>

<template>
  <div class="cmd-grid">
    <button
      v-for="item in entries"
      :key="item.meta.id"
      class="cmd-grid__item"
      type="button"
      :data-requires="item.meta.requires"
      :disabled="item.runner.disabled.value"
      @click="run(item)"
    >
      <span class="cmd-grid__title">{{ item.meta.title }}</span>
      <code class="cmd-grid__id">{{ item.meta.id }}</code>
    </button>
  </div>
</template>

<style scoped>
.cmd-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.cmd-grid__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-1);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-md);
  background: var(--c-surface-raised);
  color: var(--c-text);
  cursor: default;
}

.cmd-grid__item:disabled {
  opacity: 0.45;
}

.cmd-grid__title {
  font-size: var(--fs-md);
}

.cmd-grid__id {
  color: var(--c-text-faint);
  font-size: var(--fs-sm);
}
</style>
