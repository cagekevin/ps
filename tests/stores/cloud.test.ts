import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CloudStatus } from '@/cloud/types'

/**
 * T-74：云同步状态投影。
 * 钉住"两个数不是一个来源"：
 * - `status`（台账 + 失败痕迹，读盘）
 * - `queuedUnits`（队列内存里的脏集合，不读盘）
 * 以及 `refreshLive` 只刷内存态、不重读台账。
 */
const getStatus = vi.hoisted(() => vi.fn())
const pendingUnits = vi.hoisted(() => vi.fn())
const busy = vi.hoisted(() => vi.fn())

vi.mock('@/cep/cloud/setup', () => ({
  cloudEngine: { getStatus },
  cloudSyncQueue: { pendingUnits, busy },
}))

const { useCloudStore } = await import('@/stores/cloud')

function status(pending = 0): CloudStatus {
  return {
    configured: true,
    autoSyncEnabled: true,
    hasLedger: true,
    rev: 7,
    syncedAt: 100,
    localHash: 'h',
    pending,
    pendingItems: [],
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  getStatus.mockReset().mockReturnValue(status(2))
  pendingUnits.mockReset().mockReturnValue(['action.library'])
  busy.mockReset().mockReturnValue(true)
})

describe('cloud store 投影', () => {
  it('status 与队列脏数来自两个不同来源，互不覆盖', () => {
    const store = useCloudStore()

    // 初始化时就读了两个来源
    expect(store.status.pending).toBe(2)
    expect(store.queuedUnits).toBe(1)
    expect(store.syncing).toBe(true)
  })

  it('refresh 同时刷台账态与内存态', () => {
    const store = useCloudStore()
    getStatus.mockReturnValue(status(0))
    pendingUnits.mockReturnValue(['font.tags', 'font.hierarchy'])

    store.refresh()

    expect(store.status.pending).toBe(0)
    expect(store.queuedUnits).toBe(2)
  })

  it('refreshLive 只刷队列，不重读台账（避免 5 秒轮询读盘）', () => {
    const store = useCloudStore()
    const before = getStatus.mock.calls.length

    pendingUnits.mockReturnValue([])
    store.refreshLive()

    expect(getStatus.mock.calls.length).toBe(before)
    expect(store.queuedUnits).toBe(0)
  })
})
