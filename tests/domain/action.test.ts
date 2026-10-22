import { describe, expect, it } from 'vitest'
import { normalizeActionList, readActionList } from '@/domain/action'

describe('readActionList（区分"没有"与"结构不认识"）', () => {
  it('数组形状', () => {
    expect(readActionList([]).shape).toBe('array')
  })

  it('{ info } 形状', () => {
    expect(readActionList({ info: [] }).shape).toBe('info')
  })

  it('不认识的形状标 unknown，而不是当成空', () => {
    const result = readActionList({ weird: true })
    expect(result.shape).toBe('unknown')
    expect(result.groups).toEqual([])
  })

  it('null / undefined 当作空的数组形状', () => {
    expect(readActionList(null).shape).toBe('array')
    expect(readActionList(undefined).shape).toBe('array')
  })

  it('received 反映原始条目数', () => {
    expect(
      readActionList([
        { groupName: 'A', list: [] },
        { groupName: 'B', list: [] },
      ]).received,
    ).toBe(2)
  })
})

describe('normalizeActionList', () => {
  it('直接是数组（本地库形状）', () => {
    const result = normalizeActionList([
      { groupName: '修图', show: true, list: [{ group: '修图', name: '磨皮' }] },
    ])

    expect(result).toEqual([
      { groupName: '修图', show: true, list: [{ group: '修图', name: '磨皮' }] },
    ])
  })

  it('包在 { info } 里也能解析（PS 返回可能是这种包装）', () => {
    const result = normalizeActionList({
      info: [{ groupName: '新建', show: true, list: [{ group: '新建', name: '800' }] }],
    })

    expect(result[0].groupName).toBe('新建')
    expect(result[0].list).toHaveLength(1)
  })

  it('缺字段的项被丢掉，不抛（照抄原版 checkError 的宽容度）', () => {
    const result = normalizeActionList([
      {
        groupName: '修图',
        show: true,
        list: [{ group: '修图', name: '磨皮' }, { group: '修图' }, { name: '没有 group' }, 'bad'],
      },
    ])

    expect(result[0].list).toEqual([{ group: '修图', name: '磨皮' }])
  })

  it('组缺 show 时默认 true', () => {
    const result = normalizeActionList([{ groupName: 'A', list: [] }])
    expect(result[0].show).toBe(true)
  })

  it('没有 groupName 但有 name 时用 name 兜底', () => {
    const result = normalizeActionList([{ name: '旧格式组', list: [] }])
    expect(result[0].groupName).toBe('旧格式组')
  })

  it('非数组 / 空值返回空数组', () => {
    expect(normalizeActionList(null)).toEqual([])
    expect(normalizeActionList(undefined)).toEqual([])
    expect(normalizeActionList('x')).toEqual([])
    expect(normalizeActionList({})).toEqual([])
  })
})
