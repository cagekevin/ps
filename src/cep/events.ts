import { hasCep } from './transport'
import { log } from '@/utils/logger'

/**
 * 语义名 → PS 事件的十进制 ID。
 *
 * 原版 `$psEvent.add("1936483188" | "1416785510" | "1298866208" | "1936028772", …)`
 * （app.v4.js:42473-42476）直接写死十进制。这里保持同一份值，
 * **不再经过 `charIDToTypeID` 之类的二次转换**。
 */
export type HostEventName = 'selection' | 'transform' | 'make' | 'setd'

const EVENT_IDS: Record<HostEventName, string> = {
  selection: '1936483188', // slct
  transform: '1416785510', // Trnf
  make: '1298866208', // Mk
  setd: '1936028772', // setd
}

/** 原版 `listedHandle` 的全局节流：100ms 内的事件直接丢弃 */
const THROTTLE = 100
/** 原版 `e.data.substring(5)` */
const PREFIX_LENGTH = 5
const REGISTER_EVENT = 'com.adobe.PhotoshopRegisterEvent'
const CALLBACK_PREFIX = 'com.adobe.PhotoshopJSONCallback'

export interface PhotoshopEventPayload {
  eventID?: number
  /** 原版 `r.eventData`；字段按事件类型可选 */
  eventData?: {
    /** slct：选中图层 ID 列表 */
    layerID?: number[]
    documentID?: number
    /** Mk：null._ref === 'textLayer' */
    null?: { _ref?: string; _property?: string }
    /** setd：to._obj === 'textStyle' */
    to?: { _obj?: string }
    [key: string]: unknown
  }
  [key: string]: unknown
}

type Bridge = NonNullable<Window['__adobe_cep__']>
type Listener = (payload: PhotoshopEventPayload) => void

function bridge(): Bridge | undefined {
  return window.__adobe_cep__
}

/** 原版 CSInterface.getExtensionID() 内部就是 `window.__adobe_cep__.getExtensionId()` */
export function extensionId(): string {
  const b = bridge()
  return b && typeof b.getExtensionId === 'function' ? b.getExtensionId() : ''
}

/** 通道可用性只做一次能力判断，不在运行中兜底 */
export function hasCepEvents(): boolean {
  const b = bridge()
  return (
    hasCep() &&
    !!extensionId() &&
    typeof b?.dispatchEvent === 'function' &&
    typeof b?.addEventListener === 'function'
  )
}

/**
 * 原版 `listedHandle`：`JSON.parse(e.data.substring(5))`。
 * 不加 `indexOf('{')` 之类的兜底；解析失败就让它抛，避免静默吞事件。
 */
export function parseEventData(raw: unknown): PhotoshopEventPayload {
  if (typeof raw !== 'string') {
    throw new Error('PS 事件 payload 不是字符串')
  }
  return JSON.parse(raw.substring(PREFIX_LENGTH)) as PhotoshopEventPayload
}

/**
 * 原版 `bindEvent`：
 * `new CSEvent(type, 'APPLICATION')` → 设 extensionId / data → `dispatchEvent(event)`。
 * 真实桥收的是**对象**，不是 JSON 字符串；不补 appId。
 */
export function registerPhotoshopEvent(typeId: string): boolean {
  const b = bridge()
  const id = extensionId()
  if (!b?.dispatchEvent || !id) return false

  b.dispatchEvent({
    type: REGISTER_EVENT,
    scope: 'APPLICATION',
    // 原版 CSEvent 构造后 appId 是 undefined（own property），这里保持同形
    appId: undefined,
    extensionId: id,
    data: typeId,
  })
  return true
}

/** 原版 `addEventListener("com.adobe.PhotoshopJSONCallback" + id, handler)` */
export function onPhotoshopCallback(handler: (payload: PhotoshopEventPayload) => void): () => void {
  const b = bridge()
  const id = extensionId()
  if (!b?.addEventListener || !id) return () => {}

  const type = `${CALLBACK_PREFIX}${id}`
  const listener = (event: unknown) => {
    const data = (event as { data?: unknown } | undefined)?.data
    log.info('ps-event', '收到 PS 回调', { type, data })
    const payload = parseEventData(data)
    handler(payload)
  }

  // 原版 CSInterface.addEventListener(type, handler) 不传第三个参数；
  // 这里也不传，避免宿主把 false 当成 listener 对象
  b.addEventListener(type, listener)
  return () => {
    b.removeEventListener?.(type, listener)
  }
}

// ---------- 订阅层 ----------

const listeners = new Map<HostEventName, Set<Listener>>()
const registered = new Map<HostEventName, number>()
const pending = new Map<HostEventName, Promise<void>>()
const idToName = new Map<number, HostEventName>()
let callbackInstalled = false
let lastDispatch = 0

function ensureCallback(): void {
  if (callbackInstalled) return

  // 必须先确认监听真的挂上，再置位；否则第一次失败后
  // callbackInstalled 永远是 true，后面注册多少事件都收不到回调
  const b = bridge()
  const id = extensionId()
  if (!b?.addEventListener || !id) {
    throw new Error('CEP 回调监听不可用')
  }

  onPhotoshopCallback((payload) => {
    // 原版是全局 100ms 节流：窗口内的后续事件直接丢，不排队
    const now = Date.now()
    if (now - lastDispatch < THROTTLE) {
      log.debug('ps-event', '100ms 内丢弃事件', { eventID: payload.eventID })
      return
    }
    lastDispatch = now

    const name = idToName.get(Number(payload.eventID))
    if (!name) {
      log.warn('ps-event', '未知事件 ID', { eventID: payload.eventID })
      return
    }
    log.info('ps-event', '分发宿主事件', { name, eventID: payload.eventID })
    for (const listener of listeners.get(name) ?? []) listener(payload)
  })

  callbackInstalled = true
  log.info('ps-event', '回调监听已安装')
}

async function register(name: HostEventName): Promise<void> {
  const typeId = EVENT_IDS[name]

  ensureCallback()
  idToName.set(Number(typeId), name)

  log.info('ps-event', '开始注册 PS 事件', { name, typeId, extensionId: extensionId() })
  if (!registerPhotoshopEvent(typeId)) {
    throw new Error(`注册 PS 事件失败：${name}（${typeId}）`)
  }
  registered.set(name, Number(typeId))
  log.info('ps-event', 'PS 事件注册完成', { name, typeId })
}

/**
 * 订阅一个宿主事件。返回取消函数。
 *
 * 非 CEP 环境直接返回 no-op；CEP 里注册失败会抛错，不再静默降级。
 */
export async function subscribeHostEvent(
  name: HostEventName,
  listener: Listener,
): Promise<() => void> {
  if (!hasCep()) {
    log.warn('ps-event', '非 CEP 环境，跳过事件订阅', { name })
    return () => {}
  }

  log.info('ps-event', '订阅宿主事件', { name, extensionId: extensionId() })
  let set = listeners.get(name)
  if (!set) {
    set = new Set()
    listeners.set(name, set)
  }
  set.add(listener)

  if (!registered.has(name)) {
    try {
      const inflight = pending.get(name)
      if (inflight) {
        await inflight
      } else {
        const task = register(name).finally(() => pending.delete(name))
        pending.set(name, task)
        await task
      }
    } catch (e) {
      // 注册失败必须把刚加的 listener 回滚，否则 listeners 里会残留死函数
      set.delete(listener)
      if (set.size === 0) listeners.delete(name)
      throw e
    }
  }

  return () => {
    const current = listeners.get(name)
    if (!current) return
    current.delete(listener)
    if (current.size === 0) listeners.delete(name)
  }
}

/** 仅测试用 */
export function __resetEventsForTest(): void {
  listeners.clear()
  registered.clear()
  pending.clear()
  idToName.clear()
  callbackInstalled = false
  lastDispatch = 0
}
