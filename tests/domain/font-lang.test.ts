import { describe, expect, it } from 'vitest'
import { PREVIEW_LABEL, PREVIEW_MODES, familyLang, previewText } from '@/stores/font'

describe('familyLang', () => {
  it('纯 ASCII 家族名算英文', () => {
    expect(familyLang('MiSans')).toBe('en')
    expect(familyLang('Noto Sans SC')).toBe('en')
    expect(familyLang('Source-Han_Sans?')).toBe('en')
  })

  it('含中文算中文', () => {
    expect(familyLang('思源黑体')).toBe('cn')
    expect(familyLang('Source Han 思源')).toBe('cn')
  })

  it('空串按英文处理（正则全匹配）', () => {
    expect(familyLang('')).toBe('en')
  })
})

describe('previewText', () => {
  it('中英文分别给不同样例', () => {
    expect(previewText('MiSans')).toBe('Crazy Design')
    expect(previewText('思源黑体')).toBe('设计助理')
  })
})

describe('预览档位', () => {
  it('五档且顺序固定（none 在最前）', () => {
    expect(PREVIEW_MODES).toEqual(['none', 'small', 'medium', 'large', 'extra-large'])
  })

  it('每档都有中文名', () => {
    for (const mode of PREVIEW_MODES) expect(PREVIEW_LABEL[mode]).toBeTruthy()
  })
})
