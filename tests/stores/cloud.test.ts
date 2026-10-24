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
    // T-114：判别位是 `ledgerState`（三态）
    ledgerState: { status: 'ok', ledger: { rev: 7, syncedAt: 100, localHash: 'h' } },
    rev: 7,
    syncedAt: 100,
    localHash: 'h',
    pending,
    pendingItems: [],
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  // T-114：`getStatus()` 改成 async（台账三态），mock 也跟着返回 Promise
  getStatus.mockReset().mockResolvedValue(status(2))
  pendingUnits.mockReset().mockReturnValue(['action.library'])
  busy.mockReset().mockReturnValue(true)
})

describe('cloud store 投影', () => {
  it('status 初值是空态，refresh 后才有真值；队列脏数是另一个来源', async () => {
    const store = useCloudStore()

    // T-114：`getStatus()` 是 async，构造 store 时读不到台账，所以初值是 `emptyCloudStatus()`
    expect(store.status.ledgerState.status).toBe('none')
    expect(store.status.rev).toBe(0)

    await store.refresh()

    expect(store.status.pending).toBe(2)
    expect(store.status.rev).toBe(7)
    expect(store.queuedUnits).toBe(1)
    expect(store.syncing).toBe(true)
  })

  it('refresh 同时刷台账态与内存态', async () => {
    const store = useCloudStore()
    getStatus.mockResolvedValue(status(0))
    pendingUnits.mockReturnValue(['font.tags', 'font.hierarchy'])

    await store.refresh()

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
