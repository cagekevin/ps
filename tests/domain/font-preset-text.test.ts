import { describe, expect, it } from 'vitest'
import {
  PRESET_COUNT_MESSAGE,
  PRESET_EMPTY_MESSAGE,
  PRESET_NUMBER_MESSAGE,
  formatPresetText,
  isPresetCountValid,
  parsePresetText,
  type PresetTextIssue,
} from '@/domain/font-preset-text'

/**
 * 预设文本框的解析/格式化（`addcom` 的核心逻辑，T-68）。
 * 只断言返回值与文案，不碰 UI。
 */
/** 失败分支才有 `issue`（`PresetTextResult` 是判别联合）：先窄化再断言，断言的仍是 issue 的具体值 */
function issueOf(text: string): PresetTextIssue {
  const result = parsePresetText(text)
  if (result.ok) throw new Error(`期望解析失败，实际成功：${text}`)
  return result.issue
}

describe('font-preset-text 解析', () => {
  it('个数 6 与 24 是边界内，5 与 25 报原版个数文案', () => {
    const six = Array.from({ length: 6 }, (_, i) => i + 1).join(',')
    const twentyFour = Array.from({ length: 24 }, (_, i) => i + 1).join(',')

    expect(parsePresetText(six)).toEqual({ ok: true, values: [1, 2, 3, 4, 5, 6] })
    expect(parsePresetText(twentyFour).ok).toBe(true)

    const five = parsePresetText('1,2,3,4,5')
    expect(five).toEqual({ ok: false, issue: 'count', message: PRESET_COUNT_MESSAGE })
    const twentyFive = parsePresetText(Array.from({ length: 25 }, (_, i) => i).join(','))
    expect(twentyFive).toEqual({ ok: false, issue: 'count', message: PRESET_COUNT_MESSAGE })
    expect(isPresetCountValid(6)).toBe(true)
    expect(isPresetCountValid(24)).toBe(true)
    expect(isPresetCountValid(5)).toBe(false)
  })

  it('保留行距小数与字距负数', () => {
    const result = parsePresetText('1,1.1,1.25,1.5,2,-100')
    expect(result).toEqual({ ok: true, values: [1, 1.1, 1.25, 1.5, 2, -100] })
  })

  it('中文逗号、换行、尾逗号都当分隔符（回贴原版「每 6 个换行」的文本不报错）', () => {
    const text = '6,8,10,11,12,14\n16,18,24,30,36,48,\n'
    expect(parsePresetText(text)).toEqual({
      ok: true,
      values: [6, 8, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48],
    })
    expect(parsePresetText('6，8，10，11，12，14').ok).toBe(true)
  })

  it('空文本与全是分隔符都报「请输入数值」，而不是个数不够', () => {
    expect(parsePresetText('')).toEqual({
      ok: false,
      issue: 'empty',
      message: PRESET_EMPTY_MESSAGE,
    })
    expect(issueOf(' , ,\n')).toBe('empty')
  })

  it('非数字报数字文案（`1,2,abc` / `1e3` 都不算数字）', () => {
    expect(parsePresetText('1,2,abc')).toEqual({
      ok: false,
      issue: 'number',
      message: PRESET_NUMBER_MESSAGE,
    })
    expect(issueOf('1e3,2,3,4,5,6')).toBe('number')
  })
})

describe('font-preset-text 格式化', () => {
  it('每 6 个换行，组内逗号分隔', () => {
    expect(formatPresetText([1, 2, 3, 4, 5, 6, 7, 8])).toBe('1,2,3,4,5,6\n7,8')
    expect(formatPresetText([])).toBe('')
  })

  it('格式化后能原样解析回来（设置页打开弹窗的路径）', () => {
    const values = [6, 8, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72]
    expect(parsePresetText(formatPresetText(values))).toEqual({ ok: true, values })
  })
})
