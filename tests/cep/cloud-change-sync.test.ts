// 契约测试，非实机：pushUnits 是假实现，仓库用内存实现，全程零网络
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PushUnitsResult } from '@/cloud/types'

const pushMock = vi.hoisted(() =>
  vi.fn(async (units: string[]): Promise<PushUnitsResult> => ({
    ok: true,
    count: units.length,
    pushed: units,
  })),
)

vi.mock('@/cep/cloud/setup', () => ({ cloudEngine: { pushUnits: pushMock } }))

const { startCloudChangeSync, stopCloudChangeSync } = await import('@/cep/cloud/change-sync')
const { actionIndexRepo, actionLibraryRepo } = await import('@/cep/data/actions')
const { hierarchyRepo } = await import('@/cep/data/font-extra')
const { log } = await import('@/utils/logger')

const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

const DELAY = 3000

beforeEach(async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', fetchGuard)
  fetchGuard.mockClear()
  pushMock.mockClear()
  vi.spyOn(log, 'info').mockImplementation(() => undefined)
  vi.spyOn(log, 'warn').mockImplementation(() => undefined)
  vi.spyOn(log, 'error').mockImplementation(() => undefined)

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
  expect(fetchGuard).not.toHaveBeenCalled()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('syncChangeFileToServe 接线（T-55/T-56）', () => {
  it('动作仓库索引改动（仓库增删改）→ 3 秒后推 action.library', async () => {
    startCloudChangeSync()

    await actionIndexRepo.update((value) => {
      value.list.push({ name: '新仓库', fileName: 'sj_dz_new.json' })
    })

    await vi.advanceTimersByTimeAsync(DELAY - 1)
    expect(pushMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(['action.library'])
  })

  it('动作仓库文件改动（分组/动作）→ 同一条 action.library', async () => {
    startCloudChangeSync()

    await actionLibraryRepo.write([{ groupName: '新建文档', show: true, list: [] }])
    await vi.advanceTimersByTimeAsync(DELAY)

    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(['action.library'])
  })

  it('层级预设改动 → 推 font.hierarchy', async () => {
    startCloudChangeSync()

    await hierarchyRepo.write({ index: 1, list: [{ name: '手机端', data: [72, 50, 28] }] })
    await vi.advanceTimersByTimeAsync(DELAY)

    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(['font.hierarchy'])
  })

  it('两类事件落在同一个 3 秒窗口里 → 合并成一次推送', async () => {
    startCloudChangeSync()

    await actionIndexRepo.update((value) => {
      value.list.push({ name: '新仓库', fileName: 'sj_dz_new.json' })
    })
    await actionLibraryRepo.write([{ groupName: '新建文档', show: true, list: [] }])
    await hierarchyRepo.write({ index: 1, list: [{ name: '手机端', data: [72, 50, 28] }] })
    await vi.advanceTimersByTimeAsync(DELAY)

    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(['action.library', 'font.hierarchy'])
  })

  it('stop 之后不再推送', async () => {
    startCloudChangeSync()
    stopCloudChangeSync()

    await hierarchyRepo.write({ index: 1, list: [{ name: '手机端', data: [72, 50, 28] }] })
    await vi.advanceTimersByTimeAsync(DELAY * 2)

    expect(pushMock).not.toHaveBeenCalled()
  })
})
