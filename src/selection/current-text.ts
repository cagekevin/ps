// 是什么：当前文字图层属性的响应式快照（只读）
// 唯一入口：全项目只有这里调 `zt_getFontSimpleInfo` 并解释它的返回
// 替代了什么：字体面板组件里 `selectLayer()` 直接调 jsx 的写法
// 谁在用：stores/font-set.ts → pages/fontSet/components/FontColor.vue
// 禁止：页面/组件直接调 jsx；不要把这里的值当成可写真相（写走 commands/fontSet.ts）

import { ref, shallowRef } from 'vue'
import { subscribeHostEvent, type PhotoshopEventPayload } from '@/cep/events'
import { jsx } from '@/cep/jsx'
import { initJsx } from '@/cep/ps'
import { asJsxResult } from '@/utils/jsx-result'
import { log } from '@/utils/logger'

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface TextInfo {
  /** 带单位，原版形如 "12 点" */
  size: string
  weight: string
  fauxBold: boolean
  fauxItalic: boolean
  useAutoLeading: boolean
  leading: number
  tracking: number
  /** manual | opticalKern */
  autoKerning: string
  capitalization: string
  color: RgbColor
  family: string
  /** left | center | right */
  justification: string
}

/** 与 `V.a.info` 的 fontInfo 默认值同形，依据 app.v4.js:42262-42281 */
export const DEFAULT_TEXT_INFO: TextInfo = {
  size: '12 点',
  weight: '选择字重',
  fauxBold: false,
  fauxItalic: false,
  useAutoLeading: false,
  leading: 0,
  tracking: 0,
  autoKerning: 'manual',
  capitalization: 'Nrml',
  color: { r: 255, g: 255, b: 255 },
  family: '请选择字体',
  justification: 'left',
}

export const textInfoRef = shallowRef<TextInfo | null>(null)
export const textInfoError = ref('')

/**
 * 写操作成功后的**本地乐观更新**。
 *
 * 依据原版：`fontSetColor` 的写方法都是先改本地 `fontInfo` 再发 jsx
 * （`fontInfo.size/leading/tracking/color/fauxBold…`，见 `app.v4.js:42290-42470`），
 * 不重新调 `zt_getFontSimpleInfo`。只有选区/变换/新建/属性事件、字体家族、
 * 快捷字体切换才回读（`selectLayer` 的调用点）。
 *
 * 禁止在这里调 jsx；写失败时命令不会走到这里。
 */
export function applyTextPatch(patch: Partial<TextInfo>): void {
  const base = textInfoRef.value ?? DEFAULT_TEXT_INFO
  textInfoRef.value = { ...base, ...patch }
}

/** `zt_setFontColor` 的 data 形状与原版一致：`{ rgb: { r, g, b } }` */
export function normalizeTextColor(raw: unknown): RgbColor {
  const rgb = (raw as { rgb?: Record<string, unknown> }).rgb ?? {}
  return { r: channel(rgb.r), g: channel(rgb.g), b: channel(rgb.b) }
}

/** AppPreferences.typeUnits，原版 mounted 里读一次（app.v4.js:42471） */
export const typeUnitsRef = ref('TypeUnits.POINTS')

export async function refreshTypeUnits(): Promise<void> {
  try {
    // jsx 必须先 evalFile 注入环境变量，否则函数未定义；字体列表走 ps 时会 init，
    // 这条读路径是独立的，必须自己保证
    await initJsx()
    const raw = await jsx.font.getTypeUnits()
    if (typeof raw === 'string' && raw) typeUnitsRef.value = raw
  } catch (e) {
    log.warn('selection', '读取单位设置失败，按点处理', e)
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '')
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function bool(value: unknown): boolean {
  return value === true
}

function channel(value: unknown): number {
  return Math.min(255, Math.max(0, Math.round(num(value))))
}

/** 原版 `selectLayer` 是直接 `fontInfo = n.data`；这里只按同一份字段名映射 */
export function normalizeTextInfo(raw: unknown): TextInfo {
  const data = raw as Record<string, unknown>
  const rgb = (data.color as { rgb?: Record<string, unknown> }).rgb ?? {}

  return {
    size: text(data.size),
    weight: text(data.weight),
    fauxBold: bool(data.fauxBold),
    fauxItalic: bool(data.fauxItalic),
    useAutoLeading: bool(data.useAutoLeading),
    leading: num(data.leading),
    tracking: num(data.tracking),
    autoKerning: text(data.autoKerning),
    capitalization: text(data.capitalization),
    color: { r: channel(rgb.r), g: channel(rgb.g), b: channel(rgb.b) },
    family: text(data.family),
    justification: text(data.justification),
  }
}

/** 原版 selectLayer：`jsxNoCheck("zt_getFontSimpleInfo")`，只有 err===0 才覆盖 */
export async function refreshTextInfo(): Promise<TextInfo | null> {
  await initJsx()
  log.info('selection', '开始读取文字属性')

  let raw: unknown
  try {
    raw = await jsx.font.getFontSimpleInfo()
  } catch (error) {
    // 没有文字图层/没有文档时 jsx 会直接 throw；这是可预期的空选区，不是订阅失败
    textInfoError.value = error instanceof Error ? error.message : '读取文字属性失败'
    log.warn('selection', '读取文字属性失败', { error: textInfoError.value })
    return textInfoRef.value
  }

  const result = asJsxResult(raw)

  if (!result.ok) {
    textInfoError.value = result.msg || '读取文字属性失败'
    log.warn('selection', '读取文字属性失败', { err: result.err, msg: textInfoError.value })
    return textInfoRef.value
  }

  const next = normalizeTextInfo(result.data)
  textInfoRef.value = next
  textInfoError.value = ''
  log.info('selection', '文字属性已更新', {
    family: next.family,
    size: next.size,
    weight: next.weight,
  })
  return next
}

/** 原版 fontSetColor.openPsEvent 注册的 4 个事件（app.v4.js:42472-42476） */
const TEXT_INFO_EVENTS = ['selection', 'transform', 'make', 'setd'] as const

/**
 * 原版 `listedHandle` 的事件过滤（app.v4.js:69412-69461）：
 * - slct：只有单图层才读文字属性
 * - Mk：只有 textLayer 才读
 * - setd：只有 textStyle 才读
 * - Trnf：无条件读
 */
function shouldRefresh(
  name: (typeof TEXT_INFO_EVENTS)[number],
  payload: PhotoshopEventPayload,
): boolean {
  if (name === 'selection') {
    const ids = payload.eventData?.layerID
    return Array.isArray(ids) && ids.length === 1
  }
  if (name === 'make') return payload.eventData?.null?._ref === 'textLayer'
  if (name === 'setd') return payload.eventData?.to?._obj === 'textStyle'
  return true
}

/** 跟随 PS 的选区 / 变换 / 新建 / 属性变化刷新快照 */
export async function startTextInfoWatch(): Promise<() => void> {
  log.info('selection', '开始订阅文字属性事件', { events: TEXT_INFO_EVENTS.join(',') })
  const stops = await Promise.all(
    TEXT_INFO_EVENTS.map((name) =>
      subscribeHostEvent(name, (payload) => {
        if (!shouldRefresh(name, payload)) {
          log.info('selection', `宿主事件跳过：${name}`)
          return
        }
        log.info('selection', `宿主事件触发：${name}`)
        void refreshTextInfo().catch((e) => {
          textInfoError.value = e instanceof Error ? e.message : String(e)
          log.warn('selection', '事件触发的文字属性读取失败', e)
        })
      }),
    ),
  )
  log.info('selection', '文字属性事件订阅完成')

  await refreshTextInfo()

  return () => {
    for (const stop of stops) stop()
  }
}
