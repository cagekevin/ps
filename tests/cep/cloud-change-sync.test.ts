// 契约测试，非实机：sync 是假实现，仓库用内存实现，全程零网络
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { SyncIntent, SyncOutcome } from '@/cloud/change-sync'

/**
 * 每个用例换一个新队列：mock 成活的 getter，订阅层每次 `markDirty` 都取到当前实例。
 * 这样测的是真队列（防抖/串行）与真 repo.onChange 的接线，只有网络出口是假的。
 */
const holder = vi.hoisted(() => ({ queue: undefined as unknown }))

vi.mock('@/cep/cloud/setup', () => ({
  get cloudSyncQueue() {
    return holder.queue
  },
}))

const { createSyncQueue } = await import('@/cloud/change-sync')
const { CLOUD_SYNC_DEBOUNCE_MS } = await import('@/config/cloud')
const { startCloudChangeSync, stopCloudChangeSync } = await import('@/cep/cloud/change-sync')
const { actionIndexRepo, actionLibraryRepo } = await import('@/cep/data/actions')
const { hierarchyRepo } = await import('@/cep/data/font-extra')
const { starsRepo, tagsRepo } = await import('@/cep/data')
const { patchFontSetSettings } = await import('@/cep/data/legacy-settings')
const { cloudEntries } = await import('@/cep/cloud/entries')
const { log } = await import('@/utils/logger')

const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

const ok: SyncOutcome = { ok: true }

type Queue = ReturnType<typeof createSyncQueue>
/** 队列只认这个签名（`cloud/change-sync.ts` 的 `sync`）；mock 也要按它标注 */
let sync: Mock<(units: string[], intent: SyncIntent) => Promise<SyncOutcome>>
let queue: Queue

beforeEach(async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', fetchGuard)
  fetchGuard.mockClear()
  vi.spyOn(log, 'info').mockImplementation(() => undefined)
  vi.spyOn(log, 'warn').mockImplementation(() => undefined)
  vi.spyOn(log, 'error').mockImplementation(() => undefined)

  sync = vi.fn<(units: string[], intent: SyncIntent) => Promise<SyncOutcome>>(async () => ok)
  queue = createSyncQueue({ sync })
  holder.queue = queue

  // 先播种再启动：播种产生的写入不该被当成"用户改动"
  await actionIndexRepo.write({
    index: 0,
    list: [{ name: '默认仓库', fileName: 'sj_dz_test.json' }],
  })
  await actionLibraryRepo.write([{ groupName: '修图', show: true, list: [] }])
  await hierarchyRepo.write({ index: 0, list: [{ name: '常规', data: [92, 48, 36] }] })
})

afterEach(() => {
  stopCloudChangeSync()
  queue.stop()
  expect(fetchGuard).not.toHaveBeenCalled()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('repo 改动 → 只标脏，60 秒后才由队列发一次推送（ADR-21）', () => {
  it('动作仓库索引改动 → 60 秒后推 action.library', async () => {
    startCloudChangeSync()

    await actionIndexRepo.update((value) => {
      value.list.push({ name: '新仓库', fileName: 'sj_dz_new.json' })
    })

    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS - 1)
    expect(sync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['action.library'], 'dirty')
  })

  it('动作仓库文件改动（分组/动作）→ 同一条 action.library', async () => {
    startCloudChangeSync()

    await actionLibraryRepo.write([{ groupName: '新建文档', show: true, list: [] }])
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['action.library'], 'dirty')
  })

  it('层级预设改动 → 推 font.hierarchy', async () => {
    startCloudChangeSync()

    await hierarchyRepo.write({ index: 1, list: [{ name: '手机端', data: [72, 50, 28] }] })
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['font.hierarchy'], 'dirty')
  })

  it('触发点本身一个请求都不发（59 秒内改三次仍是零请求）', async () => {
    startCloudChangeSync()

    await actionIndexRepo.update((value) => {
      value.list.push({ name: '仓库二', fileName: 'sj_dz_two.json' })
    })
    await hierarchyRepo.write({ index: 1, list: [{ name: '手机端', data: [72, 50, 28] }] })
    await actionLibraryRepo.write([{ groupName: '批量', show: true, list: [] }])

    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS - 1)

    expect(sync).not.toHaveBeenCalled()
    expect(fetchGuard).not.toHaveBeenCalled()
    expect(queue.pendingUnits()).toEqual(['action.library', 'font.hierarchy'])
  })

  it('两类改动落在同一个静默期 → 合并成一次推送', async () => {
    startCloudChangeSync()

    await actionIndexRepo.update((value) => {
      value.list.push({ name: '新仓库', fileName: 'sj_dz_new.json' })
    })
    await hierarchyRepo.write({ index: 1, list: [{ name: '手机端', data: [72, 50, 28] }] })
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['action.library', 'font.hierarchy'], 'dirty')
  })

  /**
   * TD-11-1：5 个 unit 只有 2 个订阅过，这三个改了**不标脏、不同步、不报错**。
   * 判据：写这三个仓库之后必须出现对应 unit 的推送。
   */
  it('字体收藏改动 → 推 font.stars（TD-11-1）', async () => {
    startCloudChangeSync()

    await starsRepo.write([{ name: 'MiSans', star: 5 }])
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['font.stars'], 'dirty')
  })

  it('字体标签改动 → 推 font.tags（TD-11-1）', async () => {
    startCloudChangeSync()

    await tagsRepo.write([{ text: '标题', arr: [], xz: false }])
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['font.tags'], 'dirty')
  })

  it('字体设置写盘 → 推 font.settings（TD-11-1）', async () => {
    startCloudChangeSync()

    await patchFontSetSettings({ ztShowQuick: false })
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledWith(['font.settings'], 'dirty')
  })

  /**
   * 结构断言（防"再来一次 TD-11-1"）：期望值取自注册表 `cloudEntries` 本身，
   * 而不是再抄一份 id 清单。新增 unit 却忘了给它触发源 ⇒ `watch` 缺失编译不过；
   * 声明了却订不上（比如又退回手列）⇒ 这条红。
   */
  it('注册表里每个 unit 都有自己的触发源，五个都能标脏', async () => {
    startCloudChangeSync()

    await starsRepo.write([{ name: 'MiSans', star: 5 }])
    await tagsRepo.write([{ text: '标题', arr: [], xz: false }])
    await patchFontSetSettings({ ztShowQuick: true })
    await hierarchyRepo.write({ index: 1, list: [{ name: '手机端', data: [72, 50, 28] }] })
    await actionIndexRepo.update((value) => {
      value.list.push({ name: '新仓库', fileName: 'sj_dz_new.json' })
    })
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS)

    expect(sync).toHaveBeenCalledTimes(1)
    expect((sync.mock.calls[0][0] as string[]).slice().sort()).toEqual(
      cloudEntries.map((entry) => entry.id).sort(),
    )
  })

  it('stop 之后不再推送', async () => {
    startCloudChangeSync()
    stopCloudChangeSync()

    await hierarchyRepo.write({ index: 1, list: [{ name: '手机端', data: [72, 50, 28] }] })
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_DEBOUNCE_MS * 2)

    expect(sync).not.toHaveBeenCalled()
  })
})
