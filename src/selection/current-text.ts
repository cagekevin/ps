// 是什么：当前文字图层属性的响应式快照（只读）
// 唯一入口：全项目只有这里调 `zt_getFontSimpleInfo` 并解释它的返回
// 替代了什么：字体面板组件里 `selectLayer()` 直接调 jsx 的写法
// 谁在用：stores/font-set.ts → pages/fontSet/components/FontColor.vue
// 禁止：页面/组件直接调 jsx；不要把这里的值当成可写真相（写走 commands/fontSet.ts）

import { msg } from '@/domain/messages'
import { ref, shallowRef } from 'vue'
import { subscribeHostEvent, type PhotoshopEventPayload } from '@/cep/events'
import { jsx } from '@/cep/jsx'
import { initJsx } from '@/cep/ps'
import type { JsxOutcome } from '@/utils/jsx-result'
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
 * 快照可能是旧的。
 *
 * 与 `textInfoError` 分开：`error` 是「这次读失败了」，`stale` 是「宿主事件已经发生、
 * 但新属性迟迟没回来」——面板上还挂着上一层/上一次的值，和「选区没变所以值没变」
 * 长得一模一样。判据只认「有事件」这一刻：用户什么都没动时不算旧，不会误报。
 */
export const textInfoStale = ref('')

/** 事件触发后这么久还没拿到新属性，就认为快照冻结（读超时是 10s，这里先一步喊） */
export const STALE_AFTER_MS = 8000

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
    const rawOutcome = await jsx.font.getTypeUnits()
    if (rawOutcome.ok && typeof rawOutcome.data === 'string' && rawOutcome.data) {
      typeUnitsRef.value = rawOutcome.data
    }
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

  let result: JsxOutcome<unknown>
  try {
    result = await jsx.font.getFontSimpleInfo()
  } catch (error) {
    // 没有文字图层/没有文档时 jsx 会直接 throw；这是可预期的空选区，不是订阅失败
    textInfoError.value =
      error instanceof Error ? error.message : msg.selection.text.textInfoReadFailed
    log.warn('selection', '读取文字属性失败', { error: textInfoError.value })
    return textInfoRef.value
  }

  if (!result.ok) {
    textInfoError.value = result.reason || msg.selection.text.textInfoReadFailed
    log.warn('selection', '读取文字属性失败', { err: result.hostCode, msg: textInfoError.value })
    return textInfoRef.value
  }

  const next = normalizeTextInfo(result.data)
  textInfoRef.value = next
  textInfoError.value = ''
  if (textInfoStale.value) {
    textInfoStale.value = ''
    log.info('selection', '文字属性已跟上当前选区，旧值提示解除')
  }
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

/**
 * 跳过原因**写具体**：只写「跳过」等于没有信息——同一句日志既可能是
 * 「选中的不是文字图层」（正常）也可能是「payload 形状和官方不符」（通道坏了）。
 * 判据仍按官方口径，不因这条日志改动行为。
 */
function skipReason(
  name: (typeof TEXT_INFO_EVENTS)[number],
  payload: PhotoshopEventPayload,
): string {
  if (name === 'selection') {
    const ids = payload.eventData?.layerID
    if (!Array.isArray(ids)) return 'slct 事件没有 layerID 数组'
    return `slct 选中 ${ids.length} 个图层（官方只处理单选）`
  }
  if (name === 'make') {
    return `Mk 新建的不是文字图层（null._ref = ${String(payload.eventData?.null?._ref)}）`
  }
  if (name === 'setd') {
    return `setd 改的不是文字样式（to._obj = ${String(payload.eventData?.to?._obj)}）`
  }
  return '未知原因'
}

/**
 * 给一次刷新挂心跳：事件已经发生，属性却迟迟不回来 = 快照冻结在上一层。
 *
 * 为什么不给「事件不来」直接报警：用户什么都不做的时候本来就没有事件，那种报警
 * 会天天误报。能判定的、且后果严重的只有一种：**我们知道有事发生了，值却没跟上**。
 */
function withHeartbeat<T>(what: string, task: Promise<T>): Promise<T> {
  let settled = false
  const timer = setTimeout(() => {
    if (settled) return
    textInfoStale.value = msg.selection.fn.textInfoStale(what, String(STALE_AFTER_MS / 1000))
    log.error('selection', '文字属性更新超时，快照可能还是上一层/上一次的', {
      what,
      waitedMs: STALE_AFTER_MS,
    })
  }, STALE_AFTER_MS)

  return task.finally(() => {
    settled = true
    clearTimeout(timer)
  })
}

/** 跟随 PS 的选区 / 变换 / 新建 / 属性变化刷新快照 */
export async function startTextInfoWatch(): Promise<() => void> {
  log.info('selection', '开始订阅文字属性事件', { events: TEXT_INFO_EVENTS.join(',') })
  const stops = await Promise.all(
    TEXT_INFO_EVENTS.map((name) =>
      subscribeHostEvent(name, (payload) => {
        if (!shouldRefresh(name, payload)) {
          log.info('selection', `宿主事件跳过：${name}`, { reason: skipReason(name, payload) })
          return
        }
        log.info('selection', `宿主事件触发：${name}`)
        void withHeartbeat(
          msg.selection.fn.hostEventFired(name),
          refreshTextInfo().catch((e) => {
            textInfoError.value = e instanceof Error ? e.message : String(e)
            log.warn('selection', '事件触发的文字属性读取失败', e)
          }),
        )
      }),
    ),
  )
  log.info('selection', '文字属性事件订阅完成')

  await withHeartbeat('面板启动时', refreshTextInfo())

  return () => {
    for (const stop of stops) stop()
  }
}
