// 契约测试，非实机：只验偏好读写与日志次数，全程零网络
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetPendingWarnForTest,
  clearPendingChanges,
  readPendingChanges,
  recordPendingChanges,
} from '@/cep/cloud/pending'
import { log } from '@/utils/logger'

const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.stubGlobal('fetch', fetchGuard)
  fetchGuard.mockClear()
  warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => undefined)
  clearPendingChanges()
  __resetPendingWarnForTest()
})

afterEach(() => {
  vi.restoreAllMocks()
  expect(fetchGuard).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})

describe('待同步痕迹（未配置 / 冲突 / 网络失败）', () => {
  it('记录后可以读回来，带原因与时间', () => {
    recordPendingChanges(['font.hierarchy'], 'not-configured')

    const list = readPendingChanges()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ unit: 'font.hierarchy', reason: 'not-configured' })
    expect(list[0].at).toBeGreaterThan(0)
  })

  it('同一 unit 再次记录只更新，不重复堆积', () => {
    recordPendingChanges(['action.library'], 'not-configured')
    recordPendingChanges(['action.library'], 'conflict')

    const list = readPendingChanges()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ unit: 'action.library', reason: 'conflict' })
  })

  it('clear 指定 unit 只清那一条', () => {
    recordPendingChanges(['action.library', 'font.hierarchy'], 'network')

    clearPendingChanges(['action.library'])

    expect(readPendingChanges().map((item) => item.unit)).toEqual(['font.hierarchy'])
  })

  it('clear 不传参清空全部（整包同步成功后）', () => {
    recordPendingChanges(['action.library', 'font.hierarchy'], 'network')

    clearPendingChanges()

    expect(readPendingChanges()).toEqual([])
  })

  it('长期离线不会无限堆积：只保留最近 32 条', () => {
    const units = Array.from({ length: 40 }, (_, i) => `unit-${i}`)
    recordPendingChanges(units, 'network')

    const list = readPendingChanges()
    expect(list).toHaveLength(32)
    expect(list.at(-1)?.unit).toBe('unit-39')
  })

  it('第一次记录写一条 warn，之后同一进程不再刷屏', () => {
    warnSpy.mockClear()

    recordPendingChanges(['font.hierarchy'], 'not-configured')
    recordPendingChanges(['action.library'], 'not-configured')

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0][1])).toContain('font.hierarchy')
  })

  it('空列表什么都不记', () => {
    recordPendingChanges([], 'network')
    expect(readPendingChanges()).toEqual([])
  })
})
