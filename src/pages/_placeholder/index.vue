<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title ?? String(route.name ?? '未命名'))
</script>

<template>
  <div class="placeholder">
    <div class="badge" :class="{ deferred: route.meta.deferred }">
      {{ route.meta.deferred ? '暂缓' : '待重写' }}
    </div>
    <h2>{{ title }}</h2>
    <p class="path">{{ route.path }}</p>
    <p class="hint">
      按 BUILD-SPEC 的 <code>02-组件/</code> 和 <code>08-模板/</code> 实现这一页，<br />
      在 <code>src/pages/</code> 下新建同名文件夹替换占位组件。
    </p>
  </div>
</template>

<style scoped>
.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-7);
  text-align: center;
}

.badge {
  padding: var(--sp-1) var(--sp-4);
  border-radius: var(--r-sm);
  background: var(--c-accent-a16);
  color: var(--accent-soft);
  font-size: var(--fs-sm);
}

.badge.deferred {
  background: var(--bg-hover);
  color: var(--text-dim);
}

h2 {
  margin: var(--sp-2) 0 0;
  font-size: var(--fs-xl);
  font-weight: 600;
}

.path {
  margin: 0;
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

.hint {
  margin: var(--sp-5) 0 0;
  max-width: 260px;
  color: var(--text-dim);
  font-size: var(--fs-sm);
  line-height: 1.8;
}

code {
  padding: 1px var(--sp-2);
  border-radius: var(--r-sm);
  background: var(--bg-hover);
  font-family: Consolas, monospace;
  font-size: var(--fs-xs);
}
</style>
