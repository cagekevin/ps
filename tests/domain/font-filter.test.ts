import { describe, expect, it } from 'vitest'
import { filterFonts, hasActiveFilter, type FontFilter } from '@/domain/font-filter'
import type { Classification } from '@/domain/classification'
import type { FontItem } from '@/cep/types'

function font(family: string, names: string[] = [], ps: string[] = []): FontItem {
  return { family, weights: ['Regular'], names, postScriptNames: ps }
}

const fonts = [
  font('MiSans', ['MiSans 常规'], ['MiSans-Regular']),
  font('思源黑体', ['Source Han Sans'], ['SourceHanSans-Regular']),
  font('OPPOSans', ['OPPO Sans'], ['OPPOSans-R']),
]

const data: Classification = {
  categories: [],
  presets: {},
  commercials: ['MiSans', 'OPPOSans'],
}

function input(over: Partial<FontFilter> = {}): FontFilter {
  return { keyword: '', tag: '', state: {}, data, ...over }
}

describe('filterFonts', () => {
  it('没有任何条件时原样返回', () => {
    expect(filterFonts(fonts, input())).toHaveLength(3)
  })

  it('搜索家族名，忽略大小写和首尾空格', () => {
    expect(filterFonts(fonts, input({ keyword: '  misans ' })).map((f) => f.family)).toEqual([
      'MiSans',
    ])
  })

  it('搜索字体名与 PostScript 名', () => {
    expect(filterFonts(fonts, input({ keyword: 'Source Han' })).map((f) => f.family)).toEqual([
      '思源黑体',
    ])
    expect(filterFonts(fonts, input({ keyword: 'opposans-r' })).map((f) => f.family)).toEqual([
      'OPPOSans',
    ])
  })

  it('标签过滤只留该标签下的家族', () => {
    const result = filterFonts(fonts, input({ tag: '免费', tagFonts: ['MiSans'] }))
    expect(result.map((f) => f.family)).toEqual(['MiSans'])
  })

  it('标签存在但没有字体时返回空', () => {
    expect(filterFonts(fonts, input({ tag: '空标签', tagFonts: [] }))).toHaveLength(0)
  })

  it('标签找不到（tagFonts 为 undefined）时不过滤，与原实现一致', () => {
    expect(filterFonts(fonts, input({ tag: '不存在', tagFonts: undefined }))).toHaveLength(3)
  })

  it('面板条件生效（免费商用名单）', () => {
    const result = filterFonts(fonts, input({ state: { commercial: [1] } }))
    expect(result.map((f) => f.family)).toEqual(['MiSans', 'OPPOSans'])
  })

  it('三个条件同时生效时取交集', () => {
    const result = filterFonts(
      fonts,
      input({
        keyword: 'sans',
        tag: '免费',
        tagFonts: ['MiSans', 'OPPOSans'],
        state: { commercial: [1] },
      }),
    )
    expect(result.map((f) => f.family)).toEqual(['MiSans', 'OPPOSans'])
  })
})

describe('hasActiveFilter', () => {
  it('全空时 false', () => {
    expect(hasActiveFilter({ keyword: '   ', tag: '', state: {} })).toBe(false)
  })

  it('任一条件有值即 true', () => {
    expect(hasActiveFilter({ keyword: 'a', tag: '', state: {} })).toBe(true)
    expect(hasActiveFilter({ keyword: '', tag: 'x', state: {} })).toBe(true)
    expect(hasActiveFilter({ keyword: '', tag: '', state: { language: [1] } })).toBe(true)
  })

  it('空数组不算筛选', () => {
    expect(hasActiveFilter({ keyword: '', tag: '', state: { language: [] } })).toBe(false)
  })
})
