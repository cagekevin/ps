<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'

/**
 * 页面级错误边界。某个页面渲染崩了，只崩这一块，左侧导航还能用。
 * 全局兜底在 utils/error-handler.ts，这里负责"把崩溃限制在内容区"。
 */
const message = ref('')
const stack = ref('')

onErrorCaptured((error, _instance, info) => {
  message.value = describeCepError(error)
  stack.value = `${info}\n${error instanceof Error ? (error.stack ?? '') : ''}`
  log.error('boundary', message.value, stack.value)
  // 返回 false 阻止继续向上冒泡，避免同时触发全局 toast
  return false
})

function retry() {
  message.value = ''
  stack.value = ''
}
</script>

<template>
  <div v-if="message" class="crash">
    <p class="crash__title">{{ '这个页面出错了' }}</p>
    <p class="crash__msg">{{ message }}</p>
    <details v-if="stack" class="crash__detail">
      <summary>详情</summary>
      <pre>{{ stack }}</pre>
    </details>
    <button class="crash__btn" type="button" @click="retry">重试</button>
  </div>
  <slot v-else />
</template>

<style scoped>
.crash {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.crash__title {
  margin: 0;
  color: var(--text-strong);
  font-size: var(--fs-lg);
}

.crash__msg {
  margin: 0;
  max-width: 260px;
  color: var(--danger);
  font-size: var(--fs-md);
  word-break: break-all;
}

.crash__detail {
  max-width: 100%;
  color: var(--text-faint);
  font-size: var(--fs-sm);
  text-align: left;
}

.crash__detail pre {
  max-height: 120px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.crash__btn {
  height: var(--h-row);
  padding: 0 var(--sp-5);
  border: 1px solid var(--bg-raise);
  border-radius: var(--r-md);
  background: var(--bg-raise);
  color: var(--text-strong);
  font-size: var(--fs-md);
}
</style>
