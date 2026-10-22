import { describe, expect, it } from 'vitest'
import type { Classification } from '@/domain/classification'
import { matchFilter, usableCategories } from '@/domain/font-filter'

const data: Classification = {
  categories: [
    { key: 'rating', name: '评分', tags: [] },
    { key: 'language', name: '字体语言', extraTag: 1, tags: [] },
    { key: 'commercial', name: '授权类型', extraTag: 1, tags: [] },
    { key: 'type', name: '字体类型', tags: [] },
  ],
  presets: { 思源黑体: { type: [1], language: [1], style: [2] } },
  commercials: ['MiSans'],
}

describe('matchFilter', () => {
  it('没有筛选条件时全部放行', () => {
    expect(matchFilter('任意字体', {}, data)).toBe(true)
    expect(matchFilter('任意字体', { language: [] }, data)).toBe(true)
  })

  it('语言：1/2 只留中文，3 只留英文', () => {
    expect(matchFilter('思源黑体', { language: [1] }, data)).toBe(true)
    expect(matchFilter('MiSans', { language: [1] }, data)).toBe(false)
    expect(matchFilter('MiSans', { language: [3] }, data)).toBe(true)
    expect(matchFilter('思源黑体', { language: [3] }, data)).toBe(false)
  })

  it('授权：1 只留免费商用名单里的字体', () => {
    expect(matchFilter('MiSans', { commercial: [1] }, data)).toBe(true)
    expect(matchFilter('思源黑体', { commercial: [1] }, data)).toBe(false)
    expect(matchFilter('思源黑体', { commercial: [2] }, data)).toBe(true)
  })

  it('组间 AND：两个条件都要满足', () => {
    expect(matchFilter('思源黑体', { language: [1], commercial: [2] }, data)).toBe(true)
    expect(matchFilter('思源黑体', { language: [1], commercial: [1] }, data)).toBe(false)
  })

  it('组内 OR：任一 id 命中即可', () => {
    expect(matchFilter('MiSans', { language: [1, 3] }, data)).toBe(true)
  })

  it('presets 缺数据的字体放行，不因缺数据消失', () => {
    expect(matchFilter('没有preset的字体', { type: [1] }, data)).toBe(true)
  })

  it('presets 有数据时按 id 过滤', () => {
    expect(matchFilter('思源黑体', { type: [1] }, data)).toBe(true)
    expect(matchFilter('思源黑体', { type: [3] }, data)).toBe(false)
  })
})

describe('usableCategories', () => {
  it('只保留语言和授权两组', () => {
    expect(usableCategories(data).map((c) => c.key)).toEqual(['language', 'commercial'])
  })
})
