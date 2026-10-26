import type { App } from 'vue'
import { describeCepError } from './error-text'
import { useFeedbackStore } from '@/stores/feedback'
import { log } from './logger'

let installed = false

function report(source: string, error: unknown) {
  // `text` 只给 toast（用户文案）；日志的主文本只写"哪儿炸的"，技术原因由 `logger.oneLine`
  // 从 `error.code` / `error.cause` 渲染成原文 —— 中文不许冒充日志的诊断文本。
  const text = describeCepError(error)
  log.error('global', source, error)

  // 同类错误短时间内只提示一次，避免一个渲染循环刷出几十条 toast
  if (recent.has(text)) return
  recent.add(text)
  setTimeout(() => recent.delete(text), 5000)

  try {
    useFeedbackStore().error(text)
  } catch {
    // pinia 还没装好时忽略，日志里已经有记录
  }
}

const recent = new Set<string>()

/**
 * 全局兜底。CEP 里没有"刷新页面"这回事，一个未捕获异常就会白屏，
 * 所以这里必须把错误转成提示 + 日志，让用户还能继续操作。
 */
export function installErrorHandlers(app: App) {
  if (installed) return
  installed = true

  app.config.errorHandler = (error, _instance, info) => {
    report(`Vue(${info})`, error)
  }

  window.addEventListener('error', (event) => {
    report('window.error', event.error ?? event.message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    report('unhandledrejection', event.reason)
  })
}
