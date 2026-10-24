// 契约测试，非实机：sync 是注入的假实现，全程零网络（fetch 被 stub 成"一调用就失败"）
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  CLOUD_SYNC_BACKOFF_MS,
  CLOUD_SYNC_DEBOUNCE_MS,
  CLOUD_SYNC_MAX_WAIT_MS,
} from '@/config/cloud'
import { createSyncQueue, type SyncOutcome } from '@/cloud/change-sync'

const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

const ok: SyncOutcome = { ok: true }
const fail: SyncOutcome = { ok: false, errorCode: 'CLOUD_NETWORK' }

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

describe('同步队列：防抖 / 最大等待 / 退避 / 串行（ADR-21）', () => {
  it('标完脏要等满 60 秒才发一次请求（不是 3 秒）', async () => {
    const sync = vi.fn(async () => ok)
    const queue = createSyncQueue({ sync })

    queue.markDirty('action.library')

    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS - 1)
    expect(sync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['action.library'])
    expect(queue.pendingUnits()).toEqual([])

    queue.stop()
  })

  it('连续改动合并成一次；每来一次都重置静默期', async () => {
    const sync = vi.fn(async () => ok)
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.hierarchy')
    await vi.advanceTimersByTimeAsync(30_000)
    queue.markDirty('action.library')
    queue.markDirty('font.hierarchy')

    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS - 1)
    expect(sync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['action.library', 'font.hierarchy'])

    queue.stop()
  })

  it('手一直没停也要在 5 分钟到点时推一次（纯防抖会永远推不出去）', async () => {
    const sync = vi.fn(async () => ok)
    const queue = createSyncQueue({ sync })

    // 每 30 秒改一次：纯防抖会被无限重置，永远等不到静默期
    const step = 30_000
    queue.markDirty('action.library')
    for (let elapsed = step; elapsed <= CLOUD_SYNC_MAX_WAIT_MS - step; elapsed += step) {
      await vi.advanceTimersByTimeAsync(step)
      queue.markDirty('action.library')
    }

    // 已推进到「最大等待 - 30 秒」：还没到点
    expect(sync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(step - 1)
    expect(sync).not.toHaveBeenCalled()

    // 到点必推，不管用户还在不在改
    await vi.advanceTimersByTimeAsync(1)
    expect(sync).toHaveBeenCalledTimes(1)

    queue.stop()
  })

  it('失败按 1 → 2 → 5 → 15 分钟退避，不每轮硬撞', async () => {
    const sync = vi.fn(async () => fail)
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)
    expect(sync).toHaveBeenCalledTimes(1)

    for (const [index, delay] of CLOUD_SYNC_BACKOFF_MS.entries()) {
      await vi.advanceTimersByTimeAsync(delay - 1)
      expect(sync).toHaveBeenCalledTimes(index + 1)

      await vi.advanceTimersByTimeAsync(1)
      expect(sync).toHaveBeenCalledTimes(index + 2)
      expect(queue.attempts()).toBe(index + 2)
    }

    // 用完之后一直按最后一档（15 分钟）
    const last = CLOUD_SYNC_BACKOFF_MS[CLOUD_SYNC_BACKOFF_MS.length - 1]
    await vi.advanceTimersByTimeAsync(last)
    expect(sync).toHaveBeenCalledTimes(CLOUD_SYNC_BACKOFF_MS.length + 2)

    queue.stop()
  })

  it('成功后退避归零、脏集合清空，之后不再自己重排', async () => {
    const sync = vi
      .fn<(units: string[]) => Promise<SyncOutcome>>()
      .mockResolvedValueOnce(fail)
      .mockResolvedValueOnce(ok)
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)
    expect(queue.attempts()).toBe(1)

    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_BACKOFF_MS[0])
    expect(queue.attempts()).toBe(0)
    expect(queue.pendingUnits()).toEqual([])

    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(sync).toHaveBeenCalledTimes(2)

    queue.stop()
  })

  it('上一轮没回来不开第二轮，回来后再补一轮', async () => {
    let release: (outcome: SyncOutcome) => void = () => {}
    // 显式标注：实现里读自己的 `mock.calls`，不标注就是自引用，TS 只给 `any`（TS7022）
    type SyncFn = (units: string[]) => Promise<SyncOutcome>
    const sync: Mock<SyncFn> = vi.fn<SyncFn>(() =>
      sync.mock.calls.length === 1
        ? new Promise<SyncOutcome>((resolve) => {
            release = resolve
          })
        : Promise.resolve(ok),
    )
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)
    expect(sync).toHaveBeenCalledTimes(1)

    queue.markDirty('action.library')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)
    // 串行：第一轮还在飞，第二轮不许并发
    expect(sync).toHaveBeenCalledTimes(1)

    release(ok)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(sync).toHaveBeenCalledTimes(2)
    expect(sync.mock.calls[1][0]).toEqual(['action.library'])

    queue.stop()
  })

  it('手动整包（runSerial）与自动同步共用一条串行链', async () => {
    let releaseManual: () => void = () => {}
    const sync = vi.fn(async () => ok)
    const queue = createSyncQueue({ sync })

    const manual = queue.runSerial(
      () =>
        new Promise<void>((resolve) => {
          releaseManual = resolve
        }),
    )

    queue.markDirty('action.library')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)
    // 手动整包还在跑：自动那一轮必须等它
    expect(sync).not.toHaveBeenCalled()

    releaseManual()
    await manual
    await vi.advanceTimersByTimeAsync(0)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['action.library'])

    queue.stop()
  })

  it('被闸门挡下（没发请求）不进退避，5 分钟后慢轮询一次', async () => {
    const skip: SyncOutcome = { ok: false, skip: true, errorCode: 'CLOUD_AUTO_SYNC_OFF' }
    const sync = vi.fn(async () => skip)
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)
    expect(sync).toHaveBeenCalledTimes(1)
    expect(queue.attempts()).toBe(0)
    expect(queue.pendingUnits()).toEqual(['font.tags'])

    // 不是 1 分钟退避，是 5 分钟慢轮询
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_BACKOFF_MS[0])
    expect(sync).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_MAX_WAIT_MS - CLOUD_SYNC_BACKOFF_MS[0])
    expect(sync).toHaveBeenCalledTimes(2)
    expect(queue.attempts()).toBe(0)

    queue.stop()
  })

  it('requestSync 没有脏也跑一次 sweep（启动 / 变可见）', async () => {
    const sync = vi.fn(async () => ok)
    const queue = createSyncQueue({ sync })

    queue.requestSync('boot')
    await vi.advanceTimersByTimeAsync(0)

    expect(sync).toHaveBeenCalledWith([])

    queue.stop()
  })

  it('flushDirty 没有脏就什么都不做（变隐藏不该白打请求）', async () => {
    const sync = vi.fn(async () => ok)
    const queue = createSyncQueue({ sync })

    queue.flushDirty('hidden')
    await vi.advanceTimersByTimeAsync(0)

    expect(sync).not.toHaveBeenCalled()

    queue.stop()
  })

  it('stop 之后不再推送，脏集合清空', async () => {
    const sync = vi.fn(async () => ok)
    const queue = createSyncQueue({ sync })

    queue.markDirty('action.library')
    queue.stop()
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS * 2)

    expect(sync).not.toHaveBeenCalled()
    expect(queue.pendingUnits()).toEqual([])
  })
})

/**
 * TD-11-8：错误码要真的改变**行为**，否则就是死码。
 *
 * 这里的两个码各自钉一条策略：
 * - `retry:false`（权限错）：不再自己排重试——重试改变不了结果，只是每 15 分钟写一遍同样的错；
 * - `retryAfterMs`（限流）：可以再试，但按服务端要求拉长间隔。
 */
describe('同步队列：失败后的重试策略（TD-11-8）', () => {
  it('retry:false 的失败不再自动重试（不是"每档退避都试一遍"）', async () => {
    const sync = vi.fn(async (): Promise<SyncOutcome> => ({ ok: false, retry: false }))
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)
    expect(sync).toHaveBeenCalledTimes(1)

    // 推进整整一小时（远超最长一档 15 分钟）：不再有任何自动重试
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(sync).toHaveBeenCalledTimes(1)

    // 但脏集合不丢，下一次触发点会再试一次（用户可能已经修好权限）
    queue.requestSync('manual')
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenCalledTimes(2)

    queue.stop()
  })

  it('retryAfterMs 拉长等待：到点前不重试，到点才重试', async () => {
    const sync = vi.fn(async (): Promise<SyncOutcome> => ({ ok: false, retryAfterMs: 10 * 60_000 }))
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)
    expect(sync).toHaveBeenCalledTimes(1)

    // 走完常规第一档（1 分钟）也不许重试
    await vi.advanceTimersByTimeAsync(60_000)
    expect(sync).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(10 * 60_000 - 60_000)
    expect(sync).toHaveBeenCalledTimes(2)

    queue.stop()
  })
})

/**
 * TD-11-6：两个出口必须真的被调用。
 *
 * 契约在 `SyncQueueDeps` 里，但装配点以前一个都没接（`deps.onOutcome?.()` 空转），
 * 也没有任何用例证明"接上之后确实会响"——失败的信息就死在这一步。
 */
describe('同步队列：结局与异常的出口（TD-11-6）', () => {
  it('失败时 onOutcome 拿到 outcome 与这一轮的 unit 列表', async () => {
    const onOutcome = vi.fn()
    const sync = vi.fn(async () => fail)
    const queue = createSyncQueue({ sync, onOutcome })

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(onOutcome).toHaveBeenCalledWith(fail, ['font.tags'])

    queue.stop()
  })

  it('sync 自己抛错时 onError 拿到原异常，队列不崩', async () => {
    const onError = vi.fn()
    const boom = new Error('台账写不进去')
    const queue = createSyncQueue({
      sync: async () => {
        throw boom
      },
      onError,
    })

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(onError).toHaveBeenCalledWith(boom)
    expect(queue.attempts()).toBe(1)

    queue.stop()
  })
})

/**
 * TD-11-4：启动补偿 / 变可见的 "全量 sweep" 原先靠**脏集恰好为空**反推
 * （`units = [...dirty]` 交给 `setup.ts` 的 `units.length > 0 ? units : allSyncUnitIds()`）。
 * 后果：启动 30 秒内改过任一已订阅 unit ⇒ 这次"补偿"退化成"只推那一个"，
 * 其余 unit 一条不推。判据：sweep 触发后 `sync` 必须收到空数组（= 全部 unit），
 * 且失败/被挡后的重试仍是全量，不许退化成脏集。
 */
describe('同步队列：sweep 的意图不许靠脏集反推（TD-11-4）', () => {
  it('脏集非空时 requestSync 仍按全量 sweep 跑，不是只推脏集', async () => {
    const sync = vi.fn(async () => ok)
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.stars')
    queue.requestSync('boot')
    await vi.advanceTimersByTimeAsync(0)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith([])

    queue.stop()
  })

  it('sweep 成功 ⇒ 本轮开始时的脏集一并清掉（全部 unit 都同步过了）', async () => {
    const sync = vi.fn(async () => ok)
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.stars')
    queue.markDirty('font.tags')
    queue.requestSync('boot')
    await vi.advanceTimersByTimeAsync(0)

    expect(sync).toHaveBeenCalledWith([])
    expect(queue.pendingUnits()).toEqual([])

    queue.stop()
  })

  it('sweep 期间新标脏的改动不会被顺带清掉（只清本轮开始时那批）', async () => {
    let release: (outcome: SyncOutcome) => void = () => {}
    const sync = vi.fn<(units: string[]) => Promise<SyncOutcome>>(
      () =>
        new Promise<SyncOutcome>((resolve) => {
          release = resolve
        }),
    )
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.stars')
    queue.requestSync('boot')
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenCalledWith([])

    // sweep 还在飞的时候用户又改了一项：那是一次还没推上去的新改动
    queue.markDirty('font.tags')
    release(ok)
    await vi.advanceTimersByTimeAsync(0)

    expect(queue.pendingUnits()).toEqual(['font.tags'])

    queue.stop()
  })

  it('sweep 失败后按退避重试的仍是全量，不退化成脏集', async () => {
    const sync = vi.fn<(units: string[]) => Promise<SyncOutcome>>().mockResolvedValue(fail)
    const queue = createSyncQueue({ sync })

    queue.markDirty('font.stars')
    queue.requestSync('boot')
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenLastCalledWith([])

    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_BACKOFF_MS[0])

    expect(sync).toHaveBeenCalledTimes(2)
    expect(sync).toHaveBeenLastCalledWith([])
    expect(queue.pendingUnits()).toEqual(['font.stars'])

    queue.stop()
  })

  it('被闸门挡下后的慢轮询仍是全量（打开自动同步即可补齐）', async () => {
    const skip: SyncOutcome = { ok: false, skip: true, errorCode: 'CLOUD_AUTO_SYNC_OFF' }
    const sync = vi.fn<(units: string[]) => Promise<SyncOutcome>>().mockResolvedValue(skip)
    const queue = createSyncQueue({ sync })

    queue.requestSync('boot')
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenLastCalledWith([])

    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_MAX_WAIT_MS)

    expect(sync).toHaveBeenCalledTimes(2)
    expect(sync.mock.calls[1][0]).toEqual([])

    queue.stop()
  })
})
