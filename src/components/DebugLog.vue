<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { log } from '@/utils/logger'

/**
 * 面板内日志查看器。
 *
 * CEP 里用户打不开 devtools，所以统一日志除了进内存缓冲，
 * 还要有一个能直接点开的界面。快捷键 Ctrl+Shift+L。
 */
const open = ref(false)
const text = ref('')
const copied = ref(false)
let timer: number | undefined

function refresh(): void {
  text.value = log.dump()
}

function toggle(): void {
  open.value = !open.value
  if (open.value) refresh()
}

function copyFallback(): boolean {
  const area = document.createElement('textarea')
  area.value = text.value
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(area)
  return ok
}

async function copy(): Promise<void> {
  refresh()
  let ok = false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text.value)
      ok = true
    }
  } catch {
    // CEP 里 clipboard API 经常被拒绝，继续走 execCommand
  }
  if (!ok) ok = copyFallback()

  copied.value = ok
  if (ok) {
    window.setTimeout(() => {
      copied.value = false
    }, 1200)
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'l') {
    event.preventDefault()
    toggle()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  timer = window.setInterval(() => {
    if (open.value) refresh()
  }, 500)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="debug-log">
    <div class="debug-log__actions">
      <button
        v-if="open"
        class="debug-log__toggle"
        type="button"
        title="复制全部日志"
        @click="copy"
      >
        {{ copied ? '已复制' : '复制' }}
      </button>
      <button
        class="debug-log__toggle"
        type="button"
        title="查看运行日志（Ctrl+Shift+L）"
        @click="toggle"
      >
        日志
      </button>
    </div>

    <pre v-if="open" class="debug-log__body">{{ text }}</pre>
  </div>
</template>

<style scoped>
.debug-log {
  position: fixed;
  right: var(--sp-3);
  bottom: var(--sp-3);
  z-index: var(--z-tooltip);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--sp-2);
}

.debug-log__actions {
  display: flex;
  gap: var(--sp-2);
}

.debug-log__toggle {
  height: var(--h-control-sm);
  padding: 0 var(--sp-3);
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  color: var(--text);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.debug-log__body {
  width: min(420px, 80vw);
  max-height: 45vh;
  margin: 0;
  padding: var(--sp-3);
  overflow: auto;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  color: var(--text);
  font-size: var(--fs-xs);
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
