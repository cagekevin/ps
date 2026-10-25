// 契约测试，非实机：队列是真的，sync 是假实现，全程零网络
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { SyncIntent, SyncOutcome } from '@/cloud/change-sync'

const holder = vi.hoisted(() => ({ queue: undefined as unknown }))

vi.mock('@/cep/cloud/setup', () => ({
  get cloudSyncQueue() {
    return holder.queue
  },
}))
vi.mock('@/cep/cloud/change-sync', () => ({
  startCloudChangeSync: vi.fn(),
  stopCloudChangeSync: vi.fn(),
}))

const { createSyncQueue } = await import('@/cloud/change-sync')
const { CLOUD_SYNC_FIRST_DELAY_MS } = await import('@/config/cloud')
const { startCloudAutoSync, stopCloudAutoSync } = await import('@/cloud/auto-sync')

const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

const ok: SyncOutcome = { ok: true }

type Queue = ReturnType<typeof createSyncQueue>
/** 队列只认这个签名（`cloud/change-sync.ts` 的 `sync`）；mock 也要按它标注 */
let sync: Mock<(units: string[], intent: SyncIntent) => Promise<SyncOutcome>>
let queue: Queue
let visibility: 'visible' | 'hidden'

function setVisibility(next: 'visible' | 'hidden'): void {
  visibility = next
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('启动装配：启动补偿 + 可见性信号，没有定时器（ADR-21）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchGuard)
    fetchGuard.mockClear()

    visibility = 'visible'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })

    sync = vi.fn<(units: string[], intent: SyncIntent) => Promise<SyncOutcome>>(async () => ok)
    queue = createSyncQueue({ sync })
    holder.queue = queue
  })

  afterEach(() => {
    stopCloudAutoSync()
    queue.stop()
    expect(fetchGuard).not.toHaveBeenCalled()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('启动 30 秒后做一次启动补偿 sweep（不等 2 小时）', async () => {
    startCloudAutoSync()

    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_FIRST_DELAY_MS - 1)
    expect(sync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(sync).toHaveBeenCalledTimes(1)
    // 空数组 + intent='sweep'：全量，用哪些 unit 由队列的调用方决定（不看长度反推）
    expect(sync).toHaveBeenCalledWith([], 'sweep')
  })

  it('变隐藏：有脏立刻推一次，不等 60 秒静默期', async () => {
    startCloudAutoSync()
    queue.markDirty('action.library')

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(0)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['action.library'], 'dirty')
  })

  it('变隐藏但没脏：不发请求', async () => {
    startCloudAutoSync()

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(0)

    expect(sync).not.toHaveBeenCalled()
  })

  it('变可见：sweep 一次（补隐藏期间的掉队改动）', async () => {
    startCloudAutoSync()

    setVisibility('hidden')
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith([], 'sweep')
  })

  it('没有 2 小时定时器：没事件时推进两小时也不会自己同步', async () => {
    startCloudAutoSync()

    // 先把启动补偿那一轮走掉
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_FIRST_DELAY_MS)
    expect(sync).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2 * 60 * 60_000)
    expect(sync).toHaveBeenCalledTimes(1)
  })
})
