// 是什么：应用 ↔ 第三方的唯一网络通道（HTTP / JSONP）
// 唯一入口：所有外部请求只能经过这里；页面、组件、store 一律不许直接发请求
// 替代了什么：原版 app.v4.js:42782 `Bv()`（动态插 script + 随机回调名 + 无超时）
// 谁在用：commands/fontSet.ts 的翻译命令（参数与签名在 domain/translate.ts）
// 禁止：这里不写业务参数、不写签名、不弹提示；失败只抛 CepError

import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'

const DEFAULT_TIMEOUT = 15000
let sequence = 0

type CallbackWindow = Window & Record<string, unknown>

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
    return Promise.reject(new CepError('NETWORK', '当前环境不支持网络请求'))
  }

  const callbackName = `__pszJsonp${Date.now().toString(36)}${sequence++}`
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) query.set(key, String(value))
  query.set('callback', callbackName)

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.async = true
  script.src = `${url}?${query.toString()}`

  // JSONP 的回调名是运行时拼的（`__pszJsonp…`），`window[回调名]` 要类型化，只能给全局
  // `Window` 加字符串索引签名——那会让全仓 `window.xxx` 的拼写检查一起失效，比这一处转型更坏。
  // 断言理由：这是 20(a) 第 2 步留的第三方边界口子，.d.ts 补不了，故保留转型并登记在此
  const win = window as unknown as CallbackWindow
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
      reject(new CepError('TIMEOUT', '连接服务器超时'))
    }, opts.timeout ?? DEFAULT_TIMEOUT)

    win[callbackName] = (payload: unknown) => {
      cleanup()
      resolve(payload)
    }

    script.onerror = () => {
      log.warn('http', `JSONP 加载失败：${url}`)
      cleanup()
      reject(new CepError('NETWORK', '连接服务器失败'))
    }

    head.appendChild(script)
  })
}
