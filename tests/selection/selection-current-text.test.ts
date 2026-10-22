import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEXT_INFO,
  applyTextPatch,
  normalizeTextColor,
  normalizeTextInfo,
  textInfoRef,
} from '@/selection/current-text'

describe('normalizeTextInfo', () => {
  it('按原版 fontInfo 字段映射', () => {
    const info = normalizeTextInfo({
      size: 60,
      weight: 'Medium',
      family: '思源黑体 CN',
      leading: 12,
      tracking: 25,
      fauxBold: true,
      fauxItalic: false,
      useAutoLeading: false,
      autoKerning: 'manual',
      capitalization: 'Nrml',
      justification: 'left',
      color: { rgb: { r: 0, g: 0, b: 0 } },
    })

    expect(info).toEqual({
      size: '60',
      weight: 'Medium',
      family: '思源黑体 CN',
      leading: 12,
      tracking: 25,
      fauxBold: true,
      fauxItalic: false,
      useAutoLeading: false,
      autoKerning: 'manual',
      capitalization: 'Nrml',
      justification: 'left',
      color: { r: 0, g: 0, b: 0 },
    })
  })
})

describe('applyTextPatch（原版乐观更新）', () => {
  it('只合并给定字段，其余保持', () => {
    textInfoRef.value = { ...DEFAULT_TEXT_INFO, family: 'MiSans', leading: 0 }
    applyTextPatch({ leading: 12, tracking: 25 })

    expect(textInfoRef.value).toMatchObject({
      family: 'MiSans',
      leading: 12,
      tracking: 25,
    })
  })
})

describe('normalizeTextColor', () => {
  it('原版形状是 { rgb: { r, g, b } }', () => {
    expect(normalizeTextColor({ rgb: { r: 7, g: 8, b: 9 } })).toEqual({ r: 7, g: 8, b: 9 })
  })
})
