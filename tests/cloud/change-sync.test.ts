// 契约测试，非实机：push 是注入的假实现，全程零网络（fetch 被 stub 成"一调用就失败"）
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHANGE_SYNC_DELAY_MS, createChangeSync } from '@/cloud/change-sync'
import type { PushUnitsResult } from '@/cloud/types'

const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

function ok(pushed: string[]): PushUnitsResult {
  return { ok: true, count: pushed.length, pushed }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', fetchGuard)
  fetchGuard.mockClear()
})

afterEach(() => {
  expect(fetchGuard).not.toHaveBeenCalled()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('change sync（3 秒防抖）', () => {
  it('默认延迟就是原版的 3 秒', () => {
    expect(CHANGE_SYNC_DELAY_MS).toBe(3000)
  })

  it('连续改动只推一次，且在 3 秒后才推', async () => {
    const push = vi.fn(async (units: string[]) => ok(units))
    const sync = createChangeSync({ push })

    for (let i = 0; i < 5; i += 1) sync.notify('action.library')

    await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS - 1)
    expect(push).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith(['action.library'])
  })

  it('不同 unit 合并成一次推送，同一 unit 去重', async () => {
    const push = vi.fn(async (units: string[]) => ok(units))
    const sync = createChangeSync({ push })

    sync.notify('font.hierarchy')
    sync.notify('action.library')
    sync.notify('font.hierarchy')

    expect(sync.pending()).toEqual(['action.library', 'font.hierarchy'])
    await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS)

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith(['action.library', 'font.hierarchy'])
    expect(sync.pending()).toEqual([])
  })

  it('每来一次改动都重置计时（不会提前推半截）', async () => {
    const push = vi.fn(async (units: string[]) => ok(units))
    const sync = createChangeSync({ push })

    sync.notify('font.hierarchy')
    await vi.advanceTimersByTimeAsync(2000)
    sync.notify('font.hierarchy')
    await vi.advanceTimersByTimeAsync(2000)
    expect(push).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('上一次推送没回来之前不开第二轮', async () => {
    let resolveFirst: (result: PushUnitsResult) => void = () => {}
    const push = vi.fn((units: string[]) =>
      push.mock.calls.length === 1
        ? new Promise<PushUnitsResult>((resolve) => {
            resolveFirst = resolve
          })
        : Promise.resolve(ok(units)),
    )
    const sync = createChangeSync({ push })

    sync.notify('font.tags')
    await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS)
    expect(push).toHaveBeenCalledTimes(1)

    sync.notify('action.library')
    await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS)
    // 串行：第一轮还在飞，第二轮排队
    expect(push).toHaveBeenCalledTimes(1)

    resolveFirst(ok(['font.tags']))
    await sync.flush()

    expect(push).toHaveBeenCalledTimes(2)
    expect(push.mock.calls[1][0]).toEqual(['action.library'])
  })

  it('push 抛错只交给 onError，下一轮照常', async () => {
    const push = vi
      .fn<(units: string[]) => Promise<PushUnitsResult>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(ok(['font.hierarchy']))
    const onError = vi.fn()
    const sync = createChangeSync({ push, onError })

    sync.notify('font.hierarchy')
    await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS)
    expect(onError).toHaveBeenCalledTimes(1)

    sync.notify('font.hierarchy')
    await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS)
    expect(push).toHaveBeenCalledTimes(2)
  })

  it('flush 立即推送，不等计时器', async () => {
    const push = vi.fn(async (units: string[]) => ok(units))
    const onResult = vi.fn()
    const sync = createChangeSync({ push, onResult })

    sync.notify('action.library')
    await sync.flush()

    expect(push).toHaveBeenCalledWith(['action.library'])
    expect(onResult).toHaveBeenCalledWith(ok(['action.library']))

    // 计时器已经被 flush 取消，不会再推一次
    await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS)
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('stop 之后不再推送', async () => {
    const push = vi.fn(async (units: string[]) => ok(units))
    const sync = createChangeSync({ push })

    sync.notify('action.library')
    sync.stop()
    await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS * 2)

    expect(push).not.toHaveBeenCalled()
    expect(sync.pending()).toEqual([])
  })
})
