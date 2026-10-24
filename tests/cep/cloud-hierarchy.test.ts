// 契约测试，非实机：仓库用内存实现，全程零网络（fetch 被 stub 成"一调用就失败"）
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hierarchyRepo } from '@/cep/data/font-extra'
import { fontHierarchyEntry } from '@/cep/cloud/entries/font-hierarchy'
import { cloudEntries } from '@/cep/cloud/entries'
import { readValue } from '../support/repo-read'

const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

function inlineData(payload: Awaited<ReturnType<typeof fontHierarchyEntry.read>>): string {
  const file = payload.files[0]
  if (file.content.kind !== 'inline') throw new Error('应为内联内容')
  return file.content.data
}

beforeEach(async () => {
  vi.stubGlobal('fetch', fetchGuard)
  fetchGuard.mockClear()
  await hierarchyRepo.write({
    index: 0,
    list: [{ name: '常规', data: [92, 48, 36, 24, 15, 12] }],
  })
})

afterEach(() => {
  expect(fetchGuard).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('font.hierarchy 云同步项（T-55）', () => {
  it('已注册进 cloudEntries，且 id 不重复', () => {
    const ids = cloudEntries.map((entry) => entry.id)
    expect(ids).toContain('font.hierarchy')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('read 产出 sj_ztHierarych.json 的内联内容', async () => {
    const payload = await fontHierarchyEntry.read()

    expect(payload.files.map((file) => file.path)).toEqual(['/sj_ztHierarych.json'])
    expect(JSON.parse(inlineData(payload))).toEqual({
      index: 0,
      list: [{ name: '常规', data: [92, 48, 36, 24, 15, 12] }],
    })
  })

  it('write 写回仓库', async () => {
    const payload = await fontHierarchyEntry.read()
    const next = {
      files: [
        {
          ...payload.files[0],
          content: {
            kind: 'inline' as const,
            data: JSON.stringify({ index: 1, list: [{ name: '手机端', data: [72, 50, 28] }] }),
            encoding: 'json' as const,
          },
        },
      ],
    }

    const result = await fontHierarchyEntry.write({ ...payload, ...next })

    expect(result.ok).toBe(true)
    const saved = await hierarchyRepo.read()
    expect(readValue(saved)).toEqual({ index: 0, list: [{ name: '手机端', data: [72, 50, 28] }] })
  })

  it('write 拒绝非法载荷，仓库不变', async () => {
    const payload = await fontHierarchyEntry.read()
    const cases: unknown[] = [
      [],
      { list: [] },
      { index: 0, list: [{ name: '', data: [10] }] },
      { index: 0, list: [{ name: '常规', data: ['x'] }] },
    ]

    for (const value of cases) {
      const result = await fontHierarchyEntry.write({
        ...payload,
        files: [
          {
            ...payload.files[0],
            content: {
              kind: 'inline' as const,
              data: JSON.stringify(value),
              encoding: 'json' as const,
            },
          },
        ],
      })
      expect(result.ok).toBe(false)
    }

    expect(readValue(await hierarchyRepo.read()).list).toEqual([
      { name: '常规', data: [92, 48, 36, 24, 15, 12] },
    ])
  })

  it('read 遇到降级（读不到真实数据）时明确失败，不上传假数据', async () => {
    vi.spyOn(hierarchyRepo, 'read').mockResolvedValue({
      ok: false,
      reason: '读取失败',
    })

    await expect(fontHierarchyEntry.read()).rejects.toThrow('读取失败')
  })
})
