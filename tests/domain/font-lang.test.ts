import { describe, expect, it } from 'vitest'
import { familyLang, isAsciiFamily } from '@/domain/font-lang'
import { familyLang as familyLangFromStore } from '@/stores/font'
import { matchFilter } from '@/domain/font-filter'
import type { Classification } from '@/domain/classification'

/**
 * 字体「算中文还是英文」在全系统**只能有一个判据**。
 *
 * 改前有三份实现、两套规则：
 *   · stores/font.ts 与 FontWeight.vue 用 ASCII 字面集（原版 `app.v4.js:47561` 的 `Ax`）
 *   · domain/font-filter.ts 用 `[\u4e00-\u9fa5]`（"名字里有没有汉字"）
 * 于是 `°` 这种名字：预览按英文渲染、语言筛选判成中文——同一个字体两种答案。
 * 下面的表就是"三处必须同答"的机器判据（第三处是 FontWeight 的字形，见组件用例）。
 */

/** 判定表：结论来自原版那条正则，不来自任何一处的实现 */
const TABLE: Array<{ family: string; lang: 'en' | 'cn'; note: string }> = [
  { family: 'MiSans', lang: 'en', note: '纯英文' },
  { family: 'Segoe UI', lang: 'en', note: '带空格' },
  { family: 'Source-Han Serif_?', lang: 'en', note: '原版字符集里的 - _ ?' },
  { family: '思源黑体', lang: 'cn', note: '中文' },
  { family: '明朝', lang: 'cn', note: '日文汉字：在汉字区间内，两边都得是 cn' },
  { family: 'ヒラギノ明朝', lang: 'cn', note: '假名 + 汉字：不是 ASCII 集，旧筛选会判 en' },
  { family: '°', lang: 'cn', note: '边界：非 ASCII 但也不是汉字（旧两处在此分歧）' },
  { family: '', lang: 'en', note: '空串在原版正则下匹配（`*`）' },
]

const DATA: Classification = {
  categories: [
    { key: 'language', name: '语言', tags: [] },
    { key: 'commercial', name: '商用', tags: [] },
  ],
  commercials: [],
  presets: {},
}

describe('字体语言：唯一判据（TD-12-26）', () => {
  it.each(TABLE)('$family → $lang（$note）', ({ family, lang }) => {
    expect(isAsciiFamily(family)).toBe(lang === 'en')
    expect(familyLang(family)).toBe(lang)
  })

  it('store 的转发点与 domain 判据同一答案（不是第二份实现）', () => {
    for (const { family, lang } of TABLE) {
      expect(familyLangFromStore(family), family).toBe(lang)
    }
  })

  it('语言筛选与预览判据同一答案：cn 只对 1/2 通过，en 只对 3 通过', () => {
    for (const { family, lang } of TABLE) {
      const chinese = lang === 'cn'
      expect(matchFilter(family, { language: [1] }, DATA), `${family} 简体`).toBe(chinese)
      expect(matchFilter(family, { language: [2] }, DATA), `${family} 繁体`).toBe(chinese)
      expect(matchFilter(family, { language: [3] }, DATA), `${family} 英文`).toBe(!chinese)
    }
  })
})
