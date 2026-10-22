import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 拖入事件（T-72）的**接线测试**。
 *
 * 能证明：事件到达时 run 被调用、payload 缺失不崩、事件不来有日志、订阅失败不拆页面。
 * 不能证明：PS 是否真会在拖入时回 `1349280544`——未在真实 PS 中验证（UNVERIFIED(T-72)），
 * 所以断言全部写在「收到事件之后」，测试名带 `wiring only`。
 */

const hostEvents = vi.hoisted(() => ({
  subscribe: vi.fn(),
  off: vi.fn(),
}))

vi.mock('@/cep/events', () => ({ subscribeHostEvent: hostEvents.subscribe }))

vi.mock('@/selection', () => ({
  refresh: async () => ({ hasSelection: true, typeNumber: 1 }),
  current: () => ({ hasSelection: true, typeNumber: 1 }),
  selectionRef: { value: { hasSelection: true, typeNumber: 1 } },
}))

vi.mock('@/cep/jsx', () => ({
  jsx: {
    commonUse: {
      zoom: vi.fn(),
      flip: vi.fn(),
      embedImage: vi.fn(),
      importMultipleImages: vi.fn(),
      optimizeDoc: vi.fn(),
      transform: vi.fn(),
      referenceLines: vi.fn(),
      distribute: vi.fn(),
      getPsdList: vi.fn(),
    },
    legacy: { call: vi.fn() },
  },
}))

const { DROP_PROBE_MS, parseDropPaths, startDropImportWatch } = await import('@/commands/commonUse')

/** 模拟通道把事件推过来 */
let emit: (payload: unknown) => void

beforeEach(() => {
  vi.useFakeTimers()
  hostEvents.subscribe.mockReset()
  hostEvents.off.mockReset()
  hostEvents.subscribe.mockImplementation(
    async (_name: string, listener: (payload: unknown) => void) => {
      emit = listener
      return hostEvents.off
    },
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('parseDropPaths', () => {
  it('认数组与单值，忽略非字符串与空串', () => {
    expect(parseDropPaths({ eventData: { paths: ['a.psd', 'b.png'] } })).toEqual(['a.psd', 'b.png'])
    expect(parseDropPaths({ eventData: { file: 'c.jpg' } })).toEqual(['c.jpg'])
    expect(parseDropPaths({ eventData: { files: ['a.png', 42, ''] } })).toEqual(['a.png'])
  })

  it('没有 eventData 时返回空数组，不抛', () => {
    expect(parseDropPaths(undefined)).toEqual([])
    expect(parseDropPaths({})).toEqual([])
  })
})

describe('startDropImportWatch', () => {
  it('wiring only：事件到达就调 run，起手先不调（PS 是否真发事件无法验证）', async () => {
    const run = vi.fn()
    const stop = await startDropImportWatch({ run })

    // 订阅成功但事件还没来：一次都不该调
    expect(hostEvents.subscribe).toHaveBeenCalledWith('drop', expect.any(Function))
    expect(run).not.toHaveBeenCalled()

    emit({ eventID: 1349280544, eventData: { paths: ['a.psd'] } })

    expect(run).toHaveBeenCalledWith(['a.psd'])
    stop()
  })

  it('wiring only：payload 没路径时不崩，交给命令层报错', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const run = vi.fn()
    const stop = await startDropImportWatch({ run })

    expect(() => emit({ eventID: 1349280544 })).not.toThrow()

    expect(run).toHaveBeenCalledWith([])
    // P0：静默失败要有 warn
    expect(warn).toHaveBeenCalled()
    stop()
  })

  it('降级：事件一直不来时，探测窗口到点留一条 warn（不是静默失效）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const run = vi.fn()
    const stop = await startDropImportWatch({ run })

    expect(warn).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(DROP_PROBE_MS)

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('1349280544')
    expect(run).not.toHaveBeenCalled()
    stop()
  })

  it('降级：事件来过之后不再报「未收到」', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stop = await startDropImportWatch({ run: vi.fn() })

    emit({ eventID: 1349280544, eventData: { paths: ['a.psd'] } })
    await vi.advanceTimersByTimeAsync(DROP_PROBE_MS)

    expect(warn).not.toHaveBeenCalled()
    stop()
  })

  it('降级：订阅抛错时返回 no-op 并 warn，不把页面打挂', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    hostEvents.subscribe.mockRejectedValueOnce(new Error('注册 PS 事件失败：drop'))

    const stop = await startDropImportWatch({ run: vi.fn() })

    expect(warn).toHaveBeenCalled()
    expect(() => stop()).not.toThrow()
  })

  it('stop() 退订并停掉探测定时器', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stop = await startDropImportWatch({ run: vi.fn() })

    stop()
    await vi.advanceTimersByTimeAsync(DROP_PROBE_MS)

    expect(hostEvents.off).toHaveBeenCalledTimes(1)
    expect(warn).not.toHaveBeenCalled()
  })
})
