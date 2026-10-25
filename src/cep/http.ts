// 是什么：应用 ↔ 第三方的唯一网络通道（HTTP / JSONP）
// 唯一入口：所有外部请求只能经过这里；页面、组件、store 一律不许直接发请求
// 替代了什么：原版 app.v4.js:42782 `Bv()`（动态插 script + 随机回调名 + 无超时）
// 谁在用：commands/fontSet.ts 的翻译命令（参数与签名在 domain/translate.ts）
// 禁止：这里不写业务参数、不写签名、不弹提示；失败只抛 CepError

import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { log } from '@/utils/logger'

/**
 * 一次 POST 的结果。**非 2xx 不抛**：状态码是"怎么重试/用户去做什么"的判据（TD-11-8 那套码
 * 由调用方按 401/403/429/其余分档），网络出口只报观测（ADR-0026 ②）。
 */
export interface HttpTextResponse {
  status: number
  text: string
}

/**
 * POST 一段文本、拿回文本。**这是 `fetch` 在本仓的唯一出口**（AGENTS §17「外部网络」）。
 *
 * 抛错只有两种情况，且分得开：
 * - `TIMEOUT`：到点没回（`AbortController` 触发）；
 * - `NETWORK`：请求发不出去 / 被拒（DNS、断网、CORS…）。
 * 调用方据此按自己的错误码归类（云同步把两者都归 `CLOUD_NETWORK`，与 11-8 的判据一致：
 * 重试方式和用户动作都一样，不再细分）。
 */
export async function postText(
  url: string,
  body: string,
  opts: { timeoutMs?: number; contentType?: string } = {},
): Promise<HttpTextResponse> {
  if (typeof fetch !== 'function') {
    throw new CepError('NETWORK', msg.ps.text.networkUnsupported)
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': opts.contentType ?? 'text/plain;charset=utf-8' },
      body,
      signal: controller?.signal,
    })
    return { status: response.status, text: await response.text() }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CepError('TIMEOUT', msg.ps.fn.requestTimeout(String(Math.round(timeoutMs / 1000))))
    }
    throw new CepError('NETWORK', error instanceof Error ? error.message : '网络请求失败')
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const DEFAULT_TIMEOUT = 15000
let sequence = 0

/** JSONP 回调名：前缀是 `src/env.d.ts` 里 `Window` 的模板字面量索引签名放开的唯一前缀 */
type JsonpCallbackName = `__pszJsonp${string}`

/**
 * JSONP 请求。
 *
 * 为什么不是 fetch：原版翻译接口只提供 JSONP（`callback=xxx`），
 * 且 CEP 12 的 panel 页面里脚本注入是原版验证过的方式。
 * 依据：`app.v4.js:42782-42833`。
 *
 * 与 Bv 的差异（有意）：加了超时与 `onerror`。原版没有超时，
 * 接口挂掉时脚本标签会一直留在 head 里、Promise 永远不 settle。
 */
export function jsonp(
  url: string,
  params: Record<string, string | number> = {},
  opts: { timeout?: number } = {},
): Promise<unknown> {
  if (typeof document === 'undefined') {
    return Promise.reject(new CepError('NETWORK', msg.ps.text.networkUnsupported))
  }

  const callbackName: JsonpCallbackName = `__pszJsonp${Date.now().toString(36)}${sequence++}`
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) query.set(key, String(value))
  query.set('callback', callbackName)

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.async = true
  script.src = `${url}?${query.toString()}`

  // 回调名带 `__pszJsonp` 前缀，`Window` 的模板字面量索引签名（`src/env.d.ts`）已放行这一类属性，
  // 所以这里**不需要转型**：`window` 本身就是可写的类型，不需要 `as unknown as` 过桥（硬规则 20(a)）。
  const win = window
  const head = document.head || document.getElementsByTagName('head')[0]

  return new Promise((resolve, reject) => {
    let settled = false

    const cleanup = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      script.onerror = null
      if (script.parentNode) script.parentNode.removeChild(script)
      delete win[callbackName]
    }

    const timer = setTimeout(() => {
      log.warn('http', `JSONP 超时：${url}`)
      cleanup()
      reject(new CepError('TIMEOUT', msg.ps.text.connectServerTimeout))
    }, opts.timeout ?? DEFAULT_TIMEOUT)

    win[callbackName] = (payload: unknown) => {
      cleanup()
      resolve(payload)
    }

    script.onerror = () => {
      log.warn('http', `JSONP 加载失败：${url}`)
      cleanup()
      reject(new CepError('NETWORK', msg.ps.text.connectServerFailed))
    }

    head.appendChild(script)
  })
}
