import { describe, expect, it } from 'vitest'
import { normalizeFont } from '@/domain/font-normalize'

describe('normalizeFont', () => {
  it('新键名原样保留', () => {
    expect(
      normalizeFont({
        family: 'MiSans',
        weights: ['Regular', 'Bold'],
        names: ['MiSans'],
        postScriptNames: ['MiSans-Regular', 'MiSans-Bold'],
      }),
    ).toEqual({
      family: 'MiSans',
      weights: ['Regular', 'Bold'],
      names: ['MiSans'],
      postScriptNames: ['MiSans-Regular', 'MiSans-Bold'],
      star: 0,
    })
  })

  it('旧键名（name/zz/mz/hjm）映射到统一结构', () => {
    expect(
      normalizeFont({ name: '思源黑体', zz: ['Regular'], mz: ['思源'], hjm: ['SHS-Regular'] }),
    ).toEqual({
      family: '思源黑体',
      weights: ['Regular'],
      names: ['思源'],
      postScriptNames: ['SHS-Regular'],
      star: 0,
    })
  })

  it('新旧键名同时存在时以新键名为准', () => {
    const font = normalizeFont({ family: '新', name: '旧', weights: ['W'], zz: ['Z'] })
    expect(font?.family).toBe('新')
    expect(font?.weights).toEqual(['W'])
  })

  it('没有家族名时返回 null', () => {
    expect(normalizeFont({})).toBeNull()
    expect(normalizeFont({ family: '' })).toBeNull()
    expect(normalizeFont({ name: '' })).toBeNull()
  })

  it('非对象输入返回 null', () => {
    expect(normalizeFont(null)).toBeNull()
    expect(normalizeFont(undefined)).toBeNull()
    expect(normalizeFont('MiSans')).toBeNull()
    expect(normalizeFont(42)).toBeNull()
  })

  it('字符串字段转成单元素数组，非数组非字符串转空数组', () => {
    expect(normalizeFont({ family: 'A', weights: 'Regular' })?.weights).toEqual(['Regular'])
    expect(normalizeFont({ family: 'A', weights: 123 })?.weights).toEqual([])
  })

  it('空数组不会回退到旧键名（?? 语义）', () => {
    expect(normalizeFont({ family: 'A', weights: [], zz: ['Z'] })?.weights).toEqual([])
  })

  it('star 只接受数字，其余归 0', () => {
    expect(normalizeFont({ family: 'A', star: 3 })?.star).toBe(3)
    expect(normalizeFont({ family: 'A', star: '3' })?.star).toBe(0)
  })

  it('多余字段不会带出来', () => {
    const font = normalizeFont({ family: 'A', foo: 'bar' })
    expect(Object.keys(font ?? {}).sort()).toEqual([
      'family',
      'names',
      'postScriptNames',
      'star',
      'weights',
    ])
  })
})
