// 是什么：翻译的纯规则（语言表 / 编解码 / 签名 / 响应解析）
// 唯一入口：翻译协议的全部常量与算法只在这里；命令层只做编排
// 替代了什么：原版 `Vv`(:42811)、`qv`(:42919)、`Xv`(:42909)、`Jv.getTime`
// 谁在用：commands/fontSet.ts
// 禁止：这里不发起请求、不读写文件、不弹提示（IO 在 cep/http.ts 与 data/）

import { md5 } from '@/utils/md5'
import { isRecord } from '@/utils/guards'

/** 原版硬编码，app.v4.js:42816-42818 */
export const TRANSLATE_URL = 'http://api.fanyi.baidu.com/api/trans/vip/translate'
export const TRANSLATE_APP_ID = '20200914000565553'
export const TRANSLATE_KEY = 'GhNw0VLPC2EiKagG8Xwn'

/** 单段文本上限，app.v4.js:43339 */
export const MAX_TEXT_LENGTH = 1000

/**
 * 下拉列表，逐字对齐 app.v4.js:30887-30888（12 项）。
 * 注意：原版结束语言的**默认显示**是「英文」，但它不在这个列表里；
 * 默认 code 是 `ztTranslate.to = "auto"`。这是原版自己的不一致，照抄不"修"。
 */
export const LANGUAGES = [
  { label: '自动检测', code: 'auto' },
  { label: '中文', code: 'zh' },
  { label: '英语', code: 'en' },
  { label: '日语', code: 'jp' },
  { label: '韩语', code: 'kor' },
  { label: '法语', code: 'fra' },
  { label: '俄语', code: 'ru' },
  { label: '意大利语', code: 'it' },
  { label: '西班牙语', code: 'spa' },
  { label: '德语', code: 'de' },
  { label: '越南语', code: 'vie' },
  { label: '泰语', code: 'th' },
] as const

export const DEFAULT_FROM_LABEL = '自动检测'
export const DEFAULT_TO_LABEL = '英文'

/** 原版 `Xv`：把 jsx 返回的混淆文本编码成可发送文本 */
export function encodeText(value: string): string {
  if (!value) return value
  let out = String.fromCharCode(value.charCodeAt(0) + value.length)
  for (let i = 1; i < value.length; i++) {
    out += String.fromCharCode(value.charCodeAt(i) + value.charCodeAt(i - 1))
  }
  return escape(out)
}

/** 原版 `qv`：发送前把 jsx 返回的文本还原 */
export function decodeText(value: string): string {
  if (!value) return value
  const raw = unescape(value)
  let out = String.fromCharCode(raw.charCodeAt(0) - raw.length)
  for (let i = 1; i < raw.length; i++) {
    out += String.fromCharCode(raw.charCodeAt(i) - out.charCodeAt(i - 1))
  }
  return out
}

export interface TranslateParams {
  q: string
  appid: string
  salt: string
  from: string
  to: string
  sign: string
  _time: string
}

/** 签名 = md5(appid + q + salt + key)，顺序照抄 app.v4.js:42823 */
export function buildTranslateParams(input: {
  text: string
  from: string
  to: string
  salt?: string | number
}): TranslateParams {
  const salt = String(input.salt ?? Date.now())
  return {
    q: input.text,
    appid: TRANSLATE_APP_ID,
    salt,
    from: input.from,
    to: input.to,
    sign: md5(TRANSLATE_APP_ID + input.text + salt + TRANSLATE_KEY),
    _time: salt,
  }
}

/**
 * 翻译结果：**判别联合**（`ok` 是判别位，`text` 仅在成功臂可取，`reason` 只放外部原话）。
 * `ok` 是裸布尔、`text` 永远可取、`message` 是自由文本，三样都不合格）。
 *
 * `fail` 是可枚举的码；`reason` **只放外部原话**（百度的 `error_msg`）。
 * 生产者自己的那句话由 `msg` 渲染（判据 3：生产者不写用户话）。
 */
export type TranslateResult =
  | { status: 'ok'; text: string }
  | { status: 'error'; fail: 'badResponse' | 'badCode' | 'noResult'; reason?: string }

/**
 * 防御性解析。百度接口成功时 `error_code` 为 `"52000"`（旧版用 `"0"`，两种都认）；
 * 原版只判 `trans_result[0].dst` 是否存在，这里两种都兜。
 */
export function parseTranslateResponse(raw: unknown): TranslateResult {
  if (!isRecord(raw)) return { status: 'error', fail: 'badResponse' }

  const code = raw.error_code
  if (code !== undefined && String(code) !== '0' && String(code) !== '52000') {
    const reason = typeof raw.error_msg === 'string' ? raw.error_msg : undefined
    return reason
      ? { status: 'error', fail: 'badCode', reason }
      : { status: 'error', fail: 'badCode' }
  }

  const results = raw.trans_result
  if (!Array.isArray(results) || results.length === 0) return { status: 'error', fail: 'noResult' }

  const first = results[0]
  const dst = isRecord(first) ? first.dst : undefined
  if (typeof dst !== 'string' || !dst) return { status: 'error', fail: 'noResult' }

  return { status: 'ok', text: dst }
}
