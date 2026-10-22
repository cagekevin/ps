import { describe, expect, it } from 'vitest'
import {
  canAddQuickFont,
  QUICK_FONT_LIMIT,
  QUICK_FONT_WEIGHT_LIMIT,
  sortQuickFont,
  toQuickFont,
  visibleWeights,
} from '@/domain/quick-font'
import type { QuickFont } from '@/domain/font-set-config'

function font(overrides: Partial<QuickFont> = {}): QuickFont {
  return {
    family: '思源黑体 CN',
    name: 'Regular',
    scriptName: 'Regular',
    zz: ['Bold', 'Light', 'Regular'],
    hjm: ['Bold', 'Light', 'Regular'],
    mz: ['Bold', 'Light', 'Regular'],
    ...overrides,
  }
}

describe('sortQuickFont', () => {
  it('按原版权重顺序重排三个等长数组', () => {
    const result = sortQuickFont(font())
    expect(result.zz).toEqual(['Light', 'Regular', 'Bold'])
    expect(result.hjm).toEqual(['Light', 'Regular', 'Bold'])
    expect(result.mz).toEqual(['Light', 'Regular', 'Bold'])
  })

  it('未知字重排在末尾，保持相对顺序', () => {
    const result = sortQuickFont(
      font({ zz: ['Wide', 'Bold', 'Custom'], hjm: ['W', 'B', 'C'], mz: ['W', 'B', 'C'] }),
    )
    expect(result.zz).toEqual(['Bold', 'Wide', 'Custom'])
  })

  it('不修改入参', () => {
    const input = font()
    sortQuickFont(input)
    expect(input.zz).toEqual(['Bold', 'Light', 'Regular'])
  })
})

describe('canAddQuickFont', () => {
  it('重复家族与超过 15 个都拒绝', () => {
    expect(canAddQuickFont([font()], '思源黑体 CN')).toBe('已存在同名字体')
    const full = Array.from({ length: QUICK_FONT_LIMIT }, (_, i) => font({ family: `F${i}` }))
    expect(canAddQuickFont(full, '新字体')).toBe('最多添加15个字体哦')
    expect(canAddQuickFont([], '新字体')).toBeNull()
  })
})

describe('系统字体映射与显示上限', () => {
  it('toQuickFont 按字重数组一一对应', () => {
    const result = toQuickFont({
      family: 'MiSans',
      weights: ['Bold', 'Regular'],
      names: ['MiSans Bold', 'MiSans'],
      postScriptNames: ['MiSans-Bold', 'MiSans'],
    })
    expect(result.zz).toEqual(['Regular', 'Bold'])
    expect(result.hjm).toEqual(['MiSans', 'MiSans-Bold'])
    expect(result.name).toBe('MiSans')
  })

  it('最多显示 7 个字重', () => {
    const result = visibleWeights(font({ zz: Array.from({ length: 9 }, (_, i) => `W${i}`) }))
    expect(result).toHaveLength(QUICK_FONT_WEIGHT_LIMIT)
  })
})
