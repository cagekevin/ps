import type { Classification } from './classification'
import type { FontItem } from '@/cep/types'

/**
 * 筛选规则：**纯函数，无 IO**。
 *
 * 放这里而不是 data/ 的原因：它要能被单测覆盖，且不依赖文件读写。
 * 组间 AND、组内 OR。
 */
export type FilterState = Record<string, number[]>

/**
 * 哪些分组对当前字体列表**真正有效**。
 *
 * 类型 / 风格 / 评分依赖 `presets`，而那 1178 条全是云端字体，
 * 系统字体一条都没有 —— 放出来点了也不会有任何变化，所以不显示。
 */
const USABLE_KEYS = new Set(['language', 'commercial'])

export function usableCategories(data: Classification) {
  return data.categories.filter((category) => USABLE_KEYS.has(category.key))
}

/** 字体语言：按名称判断中英（和 stores/font.ts 的 familyLang 同规则） */
function isChinese(family: string): boolean {
  return /[\u4e00-\u9fa5]/.test(family)
}

export function matchFilter(family: string, state: FilterState, data: Classification): boolean {
  const active = Object.entries(state).filter(([, ids]) => ids.length > 0)
  if (!active.length) return true

  return active.every(([key, ids]) => {
    if (key === 'language') {
      // 1 简体 / 2 繁体 都算中文，3 English，4 日文
      const chinese = isChinese(family)
      return ids.some((id) => {
        if (id === 1 || id === 2) return chinese
        if (id === 3) return !chinese
        return false
      })
    }

    if (key === 'commercial') {
      const free = data.commercials.includes(family)
      return ids.some((id) => (id === 1 ? free : !free))
    }

    // 其余组依赖 presets，没有数据的字体直接放行（不因缺数据而消失）
    const preset = data.presets[family]
    if (!preset) return true
    return ids.some((id) => (preset[key] ?? []).includes(id))
  })
}

/**
 * 列表的筛选管线：搜索词 + 标签 + 筛选面板，三者 AND。
 *
 * 和 matchFilter 放同一个文件，是因为它们是同一条规则链的两级：
 * matchFilter 判断"单个字体是否满足面板条件"，filterFonts 在其上叠加搜索与标签。
 * 分成两个文件只会让人不知道改哪个（上一轮就是 domain/filter 与页面 filter 各一份）。
 *
 * 抽成纯函数的目的不是"好看"，是能单独测：
 * 之前写在页面的 computed 里，jsdom 起个整页才能验，实际等于没人验。
 */
export interface FontFilter {
  /** 搜索词，匹配家族名 / 字体名 / PostScript 名，忽略大小写 */
  keyword: string
  /** 当前标签名，空串表示不按标签过滤 */
  tag: string
  /** 该标签下的家族名；标签不存在时为 undefined（此时不过滤，和原实现一致） */
  tagFonts?: readonly string[]
  /** 筛选面板选中的条件 */
  state: FilterState
  /** 分类数据（`commercials` 与 `presets`） */
  data: Classification
}

export function hasActiveFilter(input: Pick<FontFilter, 'keyword' | 'tag' | 'state'>): boolean {
  return (
    input.keyword.trim().length > 0 ||
    input.tag.length > 0 ||
    Object.values(input.state).some((ids) => ids.length > 0)
  )
}

export function filterFonts(fonts: readonly FontItem[], input: FontFilter): FontItem[] {
  const keyword = input.keyword.trim().toLowerCase()
  const tagFonts = input.tag ? input.tagFonts : undefined

  return fonts.filter((font) => {
    if (tagFonts && !tagFonts.includes(font.family)) return false
    if (!matchFilter(font.family, input.state, input.data)) return false
    if (!keyword) return true
    return (
      font.family.toLowerCase().includes(keyword) ||
      font.names.some((name) => name.toLowerCase().includes(keyword)) ||
      font.postScriptNames.some((name) => name.toLowerCase().includes(keyword))
    )
  })
}
