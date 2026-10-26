import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installHostBridge, removeHostBridge, type StubBridge } from '../helpers/host-stub'

const transport = vi.hoisted(() => ({
  hasCep: vi.fn(() => true),
}))

vi.mock('@/cep/transport', () => ({
  hasCep: transport.hasCep,
}))

import {
  APP_EVENT_SEBAN,
  __resetEventsForTest,
  describeEventIdConflict,
  hasCepEvents,
  listHostEventIds,
  onAppEvent,
  onPhotoshopCallback,
  decodeEventPayload,
  registerPhotoshopEvent,
  sendAppEvent,
  subscribeHostEvent,
} from '@/cep/events'

const EXT = 'com.local.psz.panel.v5'
const CALLBACK = `com.adobe.PhotoshopJSONCallback${EXT}`
// slct 的十进制 ID，原版 $psEvent.add("1936483188", …)
const EVENT_ID = '1936483188'

/** 同一 type 可挂多个 listener：数组而非单个（见 installBridge 注释） */
let listeners: Map<string, ((event: unknown) => void)[]>
let dispatched: Record<string, unknown>[]
/** 本文件装的假桥：走 host-stub 注入，不写 `window`。`getExtensionID` 是那条"故意写错大小写"的用例要的键 */
let installed: StubBridge & { getExtensionID?: () => string }

function installBridge() {
  listeners = new Map()
  // 同一 type 可挂多个 listener（数组，不是 Map.set 覆盖）：
  // CEP 桥对 addEventListener 的真实语义未在文档里确认，这里按"广播"建模，
  // 因为色板面板与主面板在同一频道上各挂各的（sf.js:172 / app.v4.js:17773）。
  dispatched = []
  installed = installHostBridge({
    evalScript: () => {},
    getSystemPath: () => '',
    getOSInformation: () => '',
    getExtensionId: () => EXT,
    getHostEnvironment: () => '',
    dispatchEvent: (event) => {
      dispatched.push(event as Record<string, unknown>)
    },
    addEventListener: (type, handler) => {
      const arr = listeners.get(type) ?? []
      arr.push(handler)
      listeners.set(type, arr)
    },
    removeEventListener: (type, handler) => {
      const arr = listeners.get(type) ?? []
      const next = arr.filter((fn) => fn !== handler)
      if (next.length > 0) listeners.set(type, next)
      else listeners.delete(type)
    },
  })
}

/** 模拟 PS 推来一个事件 */
function emit(eventID: number | string = EVENT_ID) {
  for (const fn of listeners.get(CALLBACK) ?? []) fn({ data: `xxxxx{"eventID":${eventID}}` })
}

/** 模拟对端（色板面板）推来一个 app event */
function emitApp(channel: string, data: unknown) {
  for (const fn of listeners.get(channel) ?? []) fn({ data })
}

beforeEach(() => {
  installBridge()
  __resetEventsForTest()
  transport.hasCep.mockReturnValue(true)
  vi.useFakeTimers()
  // 原版 lastDispatch 初值 0；用非 0 起点，避免第一条事件被 100ms 窗口误伤
  vi.setSystemTime(1000)
})

afterEach(() => {
  removeHostBridge()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('EVENT_IDS 表结构', () => {
  /**
   * 一个 stringID 只能挂一个语义名。
   *
   * 为什么必须断言：`idToName` 是 `Map<number, HostEventName>`（1:1），反向映射后注册者覆盖前者，
   * 先注册那方**从此静默收不到事件**——没有异常、没有日志，只有"功能不生效"。
   * 类型层 `Record<语义名, stringID>` 不校验 value 唯一，`vue-tsc` 也不报，
   * 所以这条只能做在测试里。样式页 T-66 与常用页 T-72 抢过 `1936028772`，就是这种撞法。
   */
  it('value（stringID）不得重复', () => {
    const owner = new Map<string, string>()
    const collisions: string[] = []

    for (const [name, id] of listHostEventIds()) {
      const first = owner.get(id)
      if (first === undefined) {
        owner.set(id, name)
        continue
      }
      collisions.push(`「${first}」与「${name}」共用 stringID ${id}`)
    }

    expect(
      collisions,
      collisions.length === 0
        ? ''
        : `EVENT_IDS 有 ${collisions.length} 条撞车，先注册的那方会静默收不到事件：\n` +
            collisions.map((line) => `  - ${line}`).join('\n') +
            '\n一个 ID 只能挂一个语义名；要复用请直接用已有的语义名，不要加别名。',
    ).toEqual([])
  })

  it('语义名到 ID 的映射不少于已有 4 条（防止有人删行换取断言变绿）', () => {
    const names = listHostEventIds().map(([name]) => name)
    expect(names).toEqual(expect.arrayContaining(['selection', 'transform', 'make', 'setd']))
  })

  it('describeEventIdConflict：同一 ID 换个名字才报冲突', () => {
    expect(describeEventIdConflict(undefined, 'setd', '1936028772')).toBeNull()
    expect(describeEventIdConflict('setd', 'setd', '1936028772')).toBeNull()

    const message = describeEventIdConflict('selection', 'setd', '1936483188')
    expect(message).toContain('1936483188')
    expect(message).toContain('「selection」')
    expect(message).toContain('「setd」')
  })
})

describe('decodeEventPayload · PS 回调载荷的唯一解析入口', () => {
  it('原版约定：跳过前 5 个字符再 JSON.parse', () => {
    expect(decodeEventPayload('xxxxx{"eventID":123}')).toEqual({ value: { eventID: 123 } })
  })

  it('不是字符串 → 形状臂带字段观测（不是抛）', () => {
    expect(decodeEventPayload(42)).toMatchObject({
      fail: 'shape',
      field: 'data',
      expected: 'string',
    })
  })

  it('不是合法 JSON → `notJson`，失败臂取不到 value', () => {
    const out = decodeEventPayload('garbage')

    expect(out).toEqual({ fail: 'notJson' })
    expect('value' in out).toBe(false)
  })

  /**
   * `JSON.parse('null')` 是**合法 JSON**，但 `null` 不是对象。
   * 收口前是 `as PhotoshopEventPayload` 抹过去，之后 `payload.eventData` 直接 TypeError（TD-18-9）。
   */
  it('合法 JSON 但不是对象（null / 数组 / 标量）→ 形状臂，不当载荷用', () => {
    expect(decodeEventPayload('xxxxxnull')).toMatchObject({ fail: 'shape', expected: 'object' })
    expect(decodeEventPayload('xxxxx[]')).toMatchObject({ fail: 'shape', expected: 'object' })
    expect(decodeEventPayload('xxxxx42')).toMatchObject({ fail: 'shape', expected: 'object' })
  })
})

describe('registerPhotoshopEvent', () => {
  it('按 CSEvent 的对象形状 dispatch（不 stringify、不补 appId）', () => {
    expect(registerPhotoshopEvent(EVENT_ID)).toBe(true)

    const payload = dispatched[0]
    expect(typeof payload).toBe('object')
    expect(payload).toEqual({
      type: 'com.adobe.PhotoshopRegisterEvent',
      scope: 'APPLICATION',
      extensionId: EXT,
      data: EVENT_ID,
    })
  })

  it('dispatchEvent 抛错时向外抛', () => {
    installed.dispatchEvent = () => {
      throw new Error('boom')
    }
    expect(() => registerPhotoshopEvent(EVENT_ID)).toThrow('boom')
  })
})

describe('onPhotoshopCallback', () => {
  it('监听带扩展 ID 的回调，解析后交给 handler', () => {
    const handler = vi.fn()
    const off = onPhotoshopCallback(handler)

    expect(listeners.has(CALLBACK)).toBe(true)
    listeners.get(CALLBACK)?.[0]({ data: 'xxxxx{"eventID":1}' })
    expect(handler).toHaveBeenCalledWith({ eventID: 1 })

    off()
    expect(listeners.has(CALLBACK)).toBe(false)
  })

  /**
   * 坏载荷**不许**进 handler，也不许抛出去 ——
   * 以前 `parseEventData` 在宿主 `addEventListener` 里抛，异常被宿主吞掉，
   * 表现是「事件静默消失」。现在必须：记日志、丢弃这一次、下一次照常。
   */
  it('载荷读不懂 → 不调 handler（丢弃这一次，不是抛进宿主）', () => {
    const handler = vi.fn()
    const off = onPhotoshopCallback(handler)

    expect(() => listeners.get(CALLBACK)?.[0]({ data: 'garbage' })).not.toThrow()

    expect(handler).not.toHaveBeenCalled()

    // 下一次正常事件照常送达（丢弃是"这一次"，不是把通道关了）
    listeners.get(CALLBACK)?.[0]({ data: 'xxxxx{"eventID":2}' })
    expect(handler).toHaveBeenCalledWith({ eventID: 2 })

    off()
  })
})

describe('subscribeHostEvent', () => {
  it('同一个事件多次订阅只向 PS 注册一次（幂等）', async () => {
    const off1 = await subscribeHostEvent('selection', () => {})
    const off2 = await subscribeHostEvent('selection', () => {})

    expect(dispatched).toHaveLength(1)
    off1()
    off2()
  })

  it('并发订阅同一个事件也只注册一次', async () => {
    const [off1, off2] = await Promise.all([
      subscribeHostEvent('selection', () => {}),
      subscribeHostEvent('selection', () => {}),
    ])

    expect(dispatched).toHaveLength(1)
    off1()
    off2()
  })

  it('多个订阅者都收到；取消一个后另一个仍然收到', async () => {
    const first = vi.fn()
    const second = vi.fn()

    const offFirst = await subscribeHostEvent('selection', first)
    await subscribeHostEvent('selection', second)

    emit()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    // 原版全局 100ms 节流：窗口内的事件会被丢掉，推进时间后再发
    vi.advanceTimersByTime(100)
    offFirst()
    emit()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)
  })

  it('100ms 内连续事件只分发第一次（原版全局节流）', async () => {
    const listener = vi.fn()
    const off = await subscribeHostEvent('selection', listener)

    emit()
    emit()
    emit()

    expect(listener).toHaveBeenCalledTimes(1)
    off()
  })

  it('非本事件 ID 不触发', async () => {
    const listener = vi.fn()
    const off = await subscribeHostEvent('selection', listener)
    emit(999)

    expect(listener).not.toHaveBeenCalled()
    off()
  })

  it('PS 注册失败时向外抛，不静默降级', async () => {
    installed.dispatchEvent = () => {
      throw new Error('boom')
    }

    await expect(subscribeHostEvent('selection', () => {})).rejects.toThrow('boom')
    expect(dispatched).toHaveLength(0)
  })

  it('没有 CEP 时直接 no-op', async () => {
    transport.hasCep.mockReturnValue(false)
    const listener = vi.fn()

    const off = await subscribeHostEvent('selection', listener)
    off()

    expect(dispatched).toHaveLength(0)
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('hasCepEvents', () => {
  it('真实桥（getExtensionId）可用', () => {
    expect(hasCepEvents()).toBe(true)
  })

  it('只有大写 getExtensionID 不算可用', () => {
    // 这个用例**故意把桥改坏**（把 getExtensionId 换成大小写写错的 getExtensionID）
    // ⇒ 桥句柄的类型里已声明了 `getExtensionID`，`delete` / 赋值都不越界，不需要转型
    const bridge = installed
    delete bridge.getExtensionId
    bridge.getExtensionID = () => EXT

    expect(hasCepEvents()).toBe(false)
    expect(registerPhotoshopEvent(EVENT_ID)).toBe(false)
  })

  it('桥上没有 dispatchEvent 时为 false', () => {
    delete installed.dispatchEvent
    expect(hasCepEvents()).toBe(false)
  })
})

/**
 * 通用 app event 通道（T-125）。
 *
 * 这三个用例钉的是**官方形状**（`app.v4.js:5025-5039`）：
 * 发 = `{type, scope:'APPLICATION', data}`，**不带 extensionId**；收 = 按 type 挂监听。
 * 与 PS 宿主事件那条（`registerPhotoshopEvent`）的差别就在 extensionId，见源码注释。
 */
describe('sendAppEvent', () => {
  it('按官方形状 dispatch：APPLICATION + data 原样，不设 extensionId', () => {
    expect(sendAppEvent(APP_EVENT_SEBAN, 'GengXin')).toBe(true)

    const payload = dispatched[0]
    expect(payload).toEqual({
      type: APP_EVENT_SEBAN,
      scope: 'APPLICATION',
      appId: undefined,
      extensionId: undefined,
      data: 'GengXin',
    })
    // 官方 sendAppEvent 不读 getExtensionId；这里显式钉住"没有偷偷带上"
    expect(payload).not.toHaveProperty('extensionId', EXT)
  })

  it('data 是对象时原样交给桥，不 stringify（序列化归 CSInterface.dispatchEvent）', () => {
    const data = { type: 'setColor', data: { c: 0, m: 0, y: 0, k: 100, hex: 'FFFFFF' } }
    sendAppEvent(APP_EVENT_SEBAN, data)

    expect(dispatched[0]!.data).toBe(data)
  })

  it('桥上没有 dispatchEvent 时返回 false，不抛', () => {
    delete installed.dispatchEvent
    expect(sendAppEvent(APP_EVENT_SEBAN, 'GengXin')).toBe(false)
  })
})

describe('onAppEvent', () => {
  it('发 → 同进程订阅方收得到，data 原样', () => {
    const seen: unknown[] = []
    const off = onAppEvent(APP_EVENT_SEBAN, (data) => seen.push(data))

    sendAppEvent(APP_EVENT_SEBAN, 'GengXin')
    // 对端不在本仓：这里由测试自己把派发对象喂回监听，只验"桥形状 → 订阅方"这一段
    const sent = dispatched[0] as { type?: string; data?: unknown }
    emitApp(sent.type ?? '', sent.data)

    expect(seen).toEqual(['GengXin'])
    off()
  })

  it('data 是对象时原样到订阅方（不经 JSON 往返）', () => {
    const seen: unknown[] = []
    const off = onAppEvent(APP_EVENT_SEBAN, (data) => seen.push(data))

    const data = { type: 'setColor', data: { c: 0, m: 0, y: 0, k: 100, hex: 'FFFFFF' } }
    sendAppEvent(APP_EVENT_SEBAN, data)
    emitApp(APP_EVENT_SEBAN, (dispatched[0] as { data?: unknown }).data)

    expect(seen).toEqual([data])
    off()
  })

  it('同频道多个订阅者各挂各的，都收到；取消一个后另一个仍收到', () => {
    const first = vi.fn()
    const second = vi.fn()
    const offFirst = onAppEvent(APP_EVENT_SEBAN, first)
    const offSecond = onAppEvent(APP_EVENT_SEBAN, second)

    emitApp(APP_EVENT_SEBAN, 1)
    expect(first).toHaveBeenCalledWith(1)
    expect(second).toHaveBeenCalledWith(1)

    offFirst()
    emitApp(APP_EVENT_SEBAN, 2)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)
    expect(second).toHaveBeenLastCalledWith(2)

    offSecond()
  })

  it('别的频道不触发', () => {
    const handler = vi.fn()
    const off = onAppEvent(APP_EVENT_SEBAN, handler)

    emitApp('com.fengzi.event.other', 'x')

    expect(handler).not.toHaveBeenCalled()
    off()
  })

  it('取消后桥上的监听也摘掉（不留死函数）', () => {
    const off = onAppEvent(APP_EVENT_SEBAN, () => {})
    expect(listeners.get(APP_EVENT_SEBAN)).toHaveLength(1)

    off()
    expect(listeners.has(APP_EVENT_SEBAN)).toBe(false)
  })

  it('没有 addEventListener 的桥 → no-op，不抛', () => {
    delete installed.addEventListener
    const off = onAppEvent(APP_EVENT_SEBAN, () => {})
    off()
  })
})
