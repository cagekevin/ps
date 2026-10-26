import { describe, expect, it } from 'vitest'
import { normalizeFont } from '@/domain/font-normalize'
import { isDecodeFail } from '@/utils/decode'

/**
 * 取成功臂：`normalizeFont` 返回 `Decoded<FontItem> | DecodeFail`。
 * 这些用例只关心"归一成什么"，失败时直接抛（带 `fail`），断言主体保持原样。
 */
function norm(raw: unknown) {
  const out = normalizeFont(raw)
  if (isDecodeFail(out)) throw new Error(`预期成功，实际失败：${out.fail}`)
  return out.value
}

describe('normalizeFont', () => {
  it('新键名原样保留', () => {
    expect(
      norm({
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
    expect(norm({ name: '思源黑体', zz: ['Regular'], mz: ['思源'], hjm: ['SHS-Regular'] })).toEqual(
      {
        family: '思源黑体',
        weights: ['Regular'],
        names: ['思源'],
        postScriptNames: ['SHS-Regular'],
        star: 0,
      },
    )
  })

  it('新旧键名同时存在时以新键名为准', () => {
    const font = norm({ family: '新', name: '旧', weights: ['W'], zz: ['Z'] })
    expect(font?.family).toBe('新')
    expect(font?.weights).toEqual(['W'])
  })

  it('没有家族名时返回 null', () => {
    expect(isDecodeFail(normalizeFont({}))).toBe(true)
    expect(isDecodeFail(normalizeFont({ family: '' }))).toBe(true)
    expect(isDecodeFail(normalizeFont({ name: '' }))).toBe(true)
  })

  it('非对象输入返回 null', () => {
    expect(isDecodeFail(normalizeFont(null))).toBe(true)
    expect(isDecodeFail(normalizeFont(undefined))).toBe(true)
    expect(isDecodeFail(normalizeFont('MiSans'))).toBe(true)
    expect(isDecodeFail(normalizeFont(42))).toBe(true)
  })

  it('字符串字段转成单元素数组，非数组非字符串转空数组', () => {
    expect(norm({ family: 'A', weights: 'Regular' })?.weights).toEqual(['Regular'])
    expect(norm({ family: 'A', weights: 123 })?.weights).toEqual([])
  })

  it('空数组不会回退到旧键名（?? 语义）', () => {
    expect(norm({ family: 'A', weights: [], zz: ['Z'] })?.weights).toEqual([])
  })

  it('star 只接受数字，其余归 0', () => {
    expect(norm({ family: 'A', star: 3 })?.star).toBe(3)
    expect(norm({ family: 'A', star: '3' })?.star).toBe(0)
  })

  it('多余字段不会带出来', () => {
    const font = norm({ family: 'A', foo: 'bar' })
    expect(Object.keys(font ?? {}).sort()).toEqual([
      'family',
      'names',
      'postScriptNames',
      'star',
      'weights',
    ])
  })
})
