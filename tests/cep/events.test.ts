import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const transport = vi.hoisted(() => ({
  hasCep: vi.fn(() => true),
}))

vi.mock('@/cep/transport', () => ({
  hasCep: transport.hasCep,
}))

import {
  __resetEventsForTest,
  hasCepEvents,
  onPhotoshopCallback,
  parseEventData,
  registerPhotoshopEvent,
  subscribeHostEvent,
} from '@/cep/events'

const EXT = 'com.local.psz.panel.v5'
const CALLBACK = `com.adobe.PhotoshopJSONCallback${EXT}`
// slct 的十进制 ID，原版 $psEvent.add("1936483188", …)
const EVENT_ID = '1936483188'

let listeners: Map<string, (event: unknown) => void>
let dispatched: Record<string, unknown>[]

function installBridge() {
  listeners = new Map()
  dispatched = []
  window.__adobe_cep__ = {
    evalScript: () => {},
    getSystemPath: () => '',
    getOSInformation: () => '',
    getExtensionId: () => EXT,
    getHostEnvironment: () => '',
    dispatchEvent: (event) => {
      dispatched.push(event as Record<string, unknown>)
    },
    addEventListener: (type, handler) => {
      listeners.set(type, handler)
    },
    removeEventListener: (type) => {
      listeners.delete(type)
    },
  }
}

/** 模拟 PS 推来一个事件 */
function emit(eventID: number | string = EVENT_ID) {
  listeners.get(CALLBACK)?.({ data: `xxxxx{"eventID":${eventID}}` })
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
  delete window.__adobe_cep__
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('parseEventData', () => {
  it('原版约定：跳过前 5 个字符再 JSON.parse', () => {
    expect(parseEventData('xxxxx{"eventID":123}')).toEqual({ eventID: 123 })
  })

  it('解析失败直接抛，不静默返回 null', () => {
    expect(() => parseEventData('garbage')).toThrow()
    expect(() => parseEventData(42)).toThrow()
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
    window.__adobe_cep__!.dispatchEvent = () => {
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
    listeners.get(CALLBACK)?.({ data: 'xxxxx{"eventID":1}' })
    expect(handler).toHaveBeenCalledWith({ eventID: 1 })

    off()
    expect(listeners.has(CALLBACK)).toBe(false)
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
    window.__adobe_cep__!.dispatchEvent = () => {
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
    const bridge = window.__adobe_cep__ as unknown as Record<string, unknown>
    delete bridge.getExtensionId
    bridge.getExtensionID = () => EXT

    expect(hasCepEvents()).toBe(false)
    expect(registerPhotoshopEvent(EVENT_ID)).toBe(false)
  })

  it('桥上没有 dispatchEvent 时为 false', () => {
    delete window.__adobe_cep__!.dispatchEvent
    expect(hasCepEvents()).toBe(false)
  })
})
