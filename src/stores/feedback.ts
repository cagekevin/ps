import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'ok' | 'error' | 'warn' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  text: string
  duration: number
}

/** 不同类型的默认停留时长（毫秒） */
const DURATION: Record<ToastType, number> = {
  ok: 2000,
  info: 2000,
  warn: 2600,
  error: 3600,
}

const MAX_VISIBLE = 3

let seq = 0

export const useFeedbackStore = defineStore('feedback', () => {
  const toasts = ref<ToastItem[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()

  function dismiss(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(type: ToastType, text: string, duration?: number) {
    const message = String(text ?? '').trim()
    if (!message) return

    // 同一句话连续触发时只保留一条，避免连点刷屏
    const exist = toasts.value.find((t) => t.text === message && t.type === type)
    if (exist) {
      dismiss(exist.id)
    }

    const item: ToastItem = {
      id: ++seq,
      type,
      text: message,
      duration: duration ?? DURATION[type],
    }

    toasts.value = [...toasts.value, item].slice(-MAX_VISIBLE)
    timers.set(
      item.id,
      setTimeout(() => dismiss(item.id), item.duration),
    )
  }

  const ok = (text: string, duration?: number) => push('ok', text, duration)
  const info = (text: string, duration?: number) => push('info', text, duration)
  const warn = (text: string, duration?: number) => push('warn', text, duration)
  const error = (text: string, duration?: number) => push('error', text, duration)

  function clear() {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    toasts.value = []
  }

  return { toasts, push, ok, info, warn, error, dismiss, clear }
})
