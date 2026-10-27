// 是什么：宿主事件订阅（`evalScript` 回调 → 本地监听器）与事件 ID 冲突诊断
// 唯一入口：`subscribeHostEvent` / `register` 只在这里
// 谁在用：`selection` · `stores/*` · `cep/cloud/*`
// 禁止：`describeEventIdConflict` 是**开发者断言**（读者是写代码的人：ID 撞了就注册不上），
//   不上 UI —— 它不是失败渲染器，别和 `describeCepError` 混。

import { getBridge } from './host'
import { hasCep } from './transport'
import { log } from '@/utils/logger'
import { msg } from '@/domain/messages'
import { isRecord } from '@/utils/guards'
import { isDecodeFail, shapeFail, type Decoded, type DecodeFail } from '@/utils/decode'

/**
 * 语义名 → PS 事件的十进制 ID。
 *
 * 原版 `$psEvent.add("1936483188" | "1416785510" | "1298866208" | "1936028772", …)`
 * （app.v4.js:42473-42476）直接写死十进制。这里保持同一份值，
 * **不再经过 `charIDToTypeID` 之类的二次转换**。
 */
export type HostEventName =
  'selection' | 'transform' | 'make' | 'setd' | 'placeImage' | 'pasteImage' | 'clipMask'

/**
 * 样式页「快速吸色到组」（T-66）复用已有两个事件：
 * `setd`（1936028772）= 吸色完成、`selection`（1936483188）= 取消。
 * 这两个 stringID **已经在表里**，不能再以新名字加一遍：通道用 `idToName` 反查，
 * 同一个 ID 挂两个名字会互相覆盖，先注册的那条收不到事件。
 * 这条约束有两处兜底：`tests/cep/events.test.ts` 的「value 不得重复」断言，
 * 与 `register()` 里的 `describeEventIdConflict` 运行期拦截。
 *
 * 常用页三个「置入类」事件（T-97-1c，一手依据 `app.v4.js:37606-37615`、`:38222-38225`）：
 * `1349280544` 拖入、`1885434740` 粘贴、`1198682188` 剪贴蒙版——官方三条都绑 `dragInImage`，
 * 且 `1349280544` 额外绑 `toLinkObject`。智能填色仍不在本表（台账 T-73）。
 */
const EVENT_IDS: Record<HostEventName, string> = {
  selection: '1936483188', // slct
  transform: '1416785510', // Trnf
  make: '1298866208', // Mk
  setd: '1936028772', // setd
  // 官方 :37606 / :37609 / :37612 三条 setEvent 的十进制 ID
  placeImage: '1349280544',
  pasteImage: '1885434740',
  clipMask: '1198682188',
}

/** 供测试断言「一个 ID 只能有一个语义名」；生产代码只经 `subscribeHostEvent` 访问 */
export function listHostEventIds(): Array<[HostEventName, string]> {
  return Object.entries(EVENT_IDS) as Array<[HostEventName, string]>
}

/**
 * 反向表 `idToName` 是 1:1：一个 ID 挂两个名字时后注册者覆盖前者，前者静默收不到。
 * 返回冲突说明供 `register()` 抛出；无冲突返回 null。
 */
export function describeEventIdConflict(
  existing: HostEventName | undefined,
  name: HostEventName,
  typeId: string,
): string | null {
  if (!existing || existing === name) return null
  return (
    `PS 事件 ID ${typeId} 已由「${existing}」占用，不能再挂「${name}」：` +
    `idToName 是 1:1，覆盖会让「${existing}」静默收不到事件`
  )
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

type Listener = (payload: PhotoshopEventPayload) => void

/** 原版 CSInterface.getExtensionID() 内部就是 `window.__adobe_cep__.getExtensionId()` */
export function extensionId(): string {
  const b = getBridge()
  return b && typeof b.getExtensionId === 'function' ? b.getExtensionId() : ''
}

/** 通道可用性只做一次能力判断，不在运行中兜底 */
export function hasCepEvents(): boolean {
  const b = getBridge()
  return (
    hasCep() &&
    !!extensionId() &&
    typeof b?.dispatchEvent === 'function' &&
    typeof b?.addEventListener === 'function'
  )
}

/**
 * **PS 回调载荷的唯一解析入口**（替代原 `parseEventData`）。
 *
 * 原版 `listedHandle`：`JSON.parse(e.data.substring(5))`。但调用点在宿主的 `addEventListener` 里 —— 抛出去的异常被宿主吞掉，
 * 表现是「事件静默消失」，没人知道通道坏了（刀 4：静默吞 → 0）。
 *
 * 失败是**可枚举的结论**：不是字符串 / 不是合法 JSON / 不是对象，三臂各自带观测；
 * 由调用方记日志并明确丢弃这一次事件。**失败臂取不到 payload**。
 *
 * 唯一一处转型：`Record<string, unknown>` → `PhotoshopEventPayload`（`isRecord` 之后）。
 * **它确实声称了已知键的类型**（`layerID?: number[]` 之类）—— 这一点没被运行时证明，
 * 不能假装没声称。能守住它的只有消费侧的再窄化：取字段的地方全部是
 * `?.` + `Array.isArray` / `typeof`（见 `selection/current-text.ts`）。
 * 真正被证否的是另一半：`null` / 数组 / 标量**进不来**（`isRecord` 挡住），
 * 而那一半正是 `as` 最致命的地方。
 */
export function decodeEventPayload(raw: unknown): Decoded<PhotoshopEventPayload> | DecodeFail {
  if (typeof raw !== 'string') return shapeFail('data', 'string', raw)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.substring(PREFIX_LENGTH))
  } catch {
    return { fail: 'notJson' }
  }
  if (!isRecord(parsed)) return shapeFail('', 'object', parsed)
  return { value: parsed as PhotoshopEventPayload }
}

/**
 * 原版 `bindEvent`：
 * `new CSEvent(type, 'APPLICATION')` → 设 extensionId / data → `dispatchEvent(event)`。
 * 真实桥收的是**对象**，不是 JSON 字符串；不补 appId。
 */
export function registerPhotoshopEvent(typeId: string): boolean {
  const b = getBridge()
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
  const b = getBridge()
  const id = extensionId()
  if (!b?.addEventListener || !id) return () => {}

  const type = `${CALLBACK_PREFIX}${id}`
  const listener = (event: unknown) => {
    const data = (event as { data?: unknown } | undefined)?.data
    log.info('ps-event', '收到 PS 回调', { type, data })
    const decoded = decodeEventPayload(data)
    if (isDecodeFail(decoded)) {
      // 丢弃这一次事件但**必须看得见**：以前抛进宿主 listener，异常被吞，等于静默消失
      // detail 传**观测对象**（`{ fail, field, expected, received }`），不传渲染后的中文：
      // 渲染过一道就只剩一句话，`field` / `expected` 全丢了
      log.error('ps-event', 'PS 回调载荷读不懂，已丢弃本次事件', decoded)
      return
    }
    handler(decoded.value)
  }

  // 原版 CSInterface.addEventListener(type, handler) 不传第三个参数；
  // 这里也不传，避免宿主把 false 当成 listener 对象
  b.addEventListener(type, listener)
  return () => {
    b.removeEventListener?.(type, listener)
  }
}

// ---------- setd 分支（官方 :69412-69423）----------

/**
 * `setd`（1936028772）的官方四分支，**逐条照抄** `app.v4.js:69412-69423`：
 *
 * | 判据 | 官方处理 |
 * |---|---|
 * | `null._property === 'foregroundColor'` | `ysDrawColorToGroup` + `cyAutoFillColor('foregroundColor')` |
 * | `null._property === 'backgroundColor'` | `cyAutoFillColor('backgroundColor')` |
 * | `to._obj === 'textStyle'` | `ztSelectLayer(layerID)` |
 * | `to._obj === 'singleRow' / 'singleColumn'` | `cySmartReferenceLine(to._obj)` |
 * | 其它 | 什么都不做 |
 *
 * 顺序就是官方的 if-else 顺序（`null._property` 先判），所以这是一张**有序表**。
 * 谁改这张表，`tests/cep/setd-router.test.ts` 会拿官方源码重算一遍来对——不是自证。
 */
export const SETD_ROUTES = [
  { field: 'null._property', value: 'foregroundColor' },
  { field: 'null._property', value: 'backgroundColor' },
  { field: 'to._obj', value: 'textStyle' },
  { field: 'to._obj', value: 'singleRow' },
  { field: 'to._obj', value: 'singleColumn' },
] as const

export type SetdKind = (typeof SETD_ROUTES)[number]['value']

/**
 * 判定一个 `setd` 事件属于官方哪一支；认不出返回 null（官方那支就是"什么都不做"）。
 *
 * 为什么必须按判据分：以前 `style.pickColorToGroup` 把**任何** `setd` 都当吸色完成，
 * 于是改背景色 / 选文字 / 拖出单行选区都会把它当成"吸色好了"去读前景色。
 */
export function classifySetd(payload: PhotoshopEventPayload | undefined): SetdKind | null {
  if (!payload) return null
  const property = payload.eventData?.null?._property
  const object = payload.eventData?.to?._obj
  for (const route of SETD_ROUTES) {
    const actual = route.field === 'null._property' ? property : object
    if (actual === route.value) return route.value
  }
  return null
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
  const b = getBridge()
  const id = extensionId()
  if (!b?.addEventListener || !id) {
    throw new Error(msg.ps.text.psEventListenerUnavailable)
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

  // 先拦重复再落表：事后再发现只能丢日志，先注册那方已经静默失效了
  const conflict = describeEventIdConflict(idToName.get(Number(typeId)), name, typeId)
  if (conflict) throw new Error(conflict)

  idToName.set(Number(typeId), name)

  log.info('ps-event', '开始注册 PS 事件', { name, typeId, extensionId: extensionId() })
  if (!registerPhotoshopEvent(typeId)) {
    throw new Error(msg.ps.fn.psEventRegisterFailed(name, String(typeId)))
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

// ---------- 通用 app event 通道（T-125）----------

/**
 * 色板面板的频道名。原版四处 `sendMessageToSeBan()` 都写死这一串
 * （`app.v4.js:50217` / `:52917`），所以它是契约不是我们起的名字。
 */
export const APP_EVENT_SEBAN = 'com.fengzi.event.seban'

/**
 * **发**一个 app event。原版 `$cep.sendAppEvent(type, data)`
 * （`app.v4.js:5031-5039`）：
 *
 * ```js
 * var a = new CSEvent();
 * a.type = t; a.scope = "APPLICATION"; a.data = e;
 * CSInterface.dispatchEvent(a);
 * ```
 *
 * **与 PS 宿主事件那条（`registerPhotoshopEvent:121`）的差别只有 extensionId**：
 * 宿主事件那条要设 `extensionId = getExtensionId()`，因为 `PhotoshopRegisterEvent`
 * 的接收方是**宿主自己**，靠 extensionId 认出"哪来的、回哪儿去"；回调频道名也因此
 * 必须是 `com.adobe.PhotoshopJSONCallback<extensionId>`（`onPhotoshopCallback:143`）。
 * app event 的接收方是**另一个 CEP 扩展**（色板面板 `ps.sf.SheJiZhuLi.seban`），
 * 它 `addEventListener(type)` 时不知道我们的 extensionId，所以官方**不设**。
 * 设了反而收不到：官方 `bindAppEvent`（`:5025-5029`）只按 type 匹配，
 * 多带的字段在这里不被用作匹配键。
 *
 * data 原样透传（对象不 stringify）：CSInterface.dispatchEvent 收到对象会
 * `JSON.stringify`（`CSInterface.js` 的 `dispatchEvent`），到对端解析回对象；
 * 我们这里不做二次序列化，交给桥。
 *
 * **UNVERIFIED：本仓没有接收方**（色板面板是独立扩展 `ps.sf.SheJiZhuLi.seban`，
 * 面板真身 `%APPDATA%/fz.FengZi3Hao/` 不在仓库）。本函数只保证"按官方形状把事件
 * 交给 CEP 桥"，"发出去有没有人收、收不收得到"未验。见 T-125。
 */
export function sendAppEvent(channel: string, data: unknown): boolean {
  const b = getBridge()
  if (!b?.dispatchEvent) return false

  b.dispatchEvent({
    type: channel,
    scope: 'APPLICATION',
    // 原版 CSEvent 构造后 appId / extensionId 都是 undefined（own property）
    appId: undefined,
    extensionId: undefined,
    data,
  })
  return true
}

/**
 * **收**一个 app event。原版 `$cep.bindAppEvent(type, handler)`
 * （`app.v4.js:5025-5029`）：`CSInterface.addEventListener(type, handler)`。
 *
 * 与 `onPhotoshopCallback` 的差别：那条挂在**带 extensionId 的回调频道**上、payload
 * 要 `substring(5)` 再 `JSON.parse`（`decodeEventPayload`，失败是判别联合）；这条挂在**调用方给的频道**
 * 上，`event.data` 已经是对象，不解析、不加前缀。
 *
 * 每个订阅者各挂一个桥监听（不共用）：桥的 `addEventListener` 是 type → listener 的
 * 1:1 注册，共用时后挂的会覆盖先挂的。多个订阅者各自收到同一份 data。
 * 返回取消函数；非 CEP 环境返回 no-op（与 `subscribeHostEvent` 同规矩）。
 */
export function onAppEvent(channel: string, handler: (data: unknown) => void): () => void {
  const b = getBridge()
  if (!b?.addEventListener) {
    log.warn('app-event', '桥上没有 addEventListener，跳过订阅', { channel })
    return () => {}
  }

  const listener = (event: unknown) => {
    const data = (event as { data?: unknown } | undefined)?.data
    log.info('app-event', '收到 app event', { channel, data })
    handler(data)
  }

  // 原版 CSInterface.addEventListener(type, handler) 不传第三个参数；
  // 这里也不传，避免宿主把 false 当成 listener 对象
  b.addEventListener(channel, listener)
  return () => {
    b.removeEventListener?.(channel, listener)
  }
}
