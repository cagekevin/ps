<script setup lang="ts">
import GButton from '@/components/GButton.vue'
import NewSpin from '@/components/NewSpin.vue'
import { useTaskStore } from '@/stores/tasks'

/**
 * 长任务浮层。`kind: 'long'` 的命令由 registry 自动 begin/end，
 * 命令里用 `ctx.progress.update(0–1, detail)` 上报。
 *
 * 不确定进度时显示转圈，不假装知道百分比。
 */
const store = useTaskStore()
</script>

<template>
  <div v-if="store.tasks.length" class="task-hud" role="status" aria-live="polite">
    <div v-for="task in store.tasks" :key="task.id" class="task-hud__item">
      <NewSpin v-if="task.progress === undefined" :size="12" />
      <div class="task-hud__body">
        <div class="task-hud__row">
          <span class="task-hud__title">{{ task.title }}</span>
          <span v-if="task.detail" class="task-hud__detail">{{ task.detail }}</span>
          <GButton
            v-if="task.cancel"
            size="small"
            type="text"
            class="task-hud__cancel"
            @click="store.cancel(task.id)"
          >
            取消
          </GButton>
        </div>
        <div v-if="task.progress !== undefined" class="task-hud__bar">
          <span class="task-hud__fill" :style="{ width: `${Math.round(task.progress * 100)}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-hud {
  position: fixed;
  left: 50%;
  bottom: var(--sp-7);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  width: var(--task-hud-width, 260px);
  padding: var(--sp-4);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-lg);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
  color: var(--c-text);
  font-size: var(--fs-sm);
  transform: translateX(-50%);
}

.task-hud__item {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
}

.task-hud__body {
  flex: 1;
  min-width: 0;
}

.task-hud__row {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}

.task-hud__title {
  color: var(--c-text-strong);
}

.task-hud__detail {
  color: var(--c-text-faint);
}

.task-hud__bar {
  height: var(--sp-1);
  margin-top: var(--sp-2);
  border-radius: var(--r-pill);
  background: var(--c-border-strong);
  overflow: hidden;
}

.task-hud__fill {
  display: block;
  height: 100%;
  background: var(--c-accent);
  transition: width var(--dur-fast) var(--ease);
}
</style>
