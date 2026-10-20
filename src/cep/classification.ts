import { readTextSmart, userDir } from './fs'

/**
 * 字体分类数据。原版存在 %APPDATA%\SheJiZhuLi\classification.json，
 * 结构见 docs/jsx-契约.md：
 *   categories: { 评分/字体语言/授权类型/字体类型/字体风格 } → 每组的可选标签
 *   presets:    { 字体名 → { type:[id], language:[id], style:[id] } }
 */
export interface CategoryTag {
  id: number
  category: string
  name?: string
  /** 评分类用图标重复次数，如 3 星 */
  icon?: string
  repeat?: number
}

export interface Category {
  key: string
  name: string
  /** 有值表示该组额外带一个「全部」项 */
  extraTag?: number
  tags: CategoryTag[]
}

export interface Classification {
  categories: Category[]
  presets: Record<string, Record<string, number[]>>
  /** 免费商用字体名单（原版 classification.json 的 commercials 数组） */
  commercials: string[]
}

const FILE = 'classification.json'

/** 分类顺序按原版面板的展示顺序 */
const ORDER = ['rating', 'language', 'commercial', 'type', 'style']

/** mock：浏览器里没有真实文件时用这个，保证面板能看 */
const MOCK: Classification = {
  categories: [
    { key: 'rating', name: '评分', tags: [
      { id: 1, category: 'rating', icon: 'star_fill', repeat: 1 },
      { id: 2, category: 'rating', icon: 'star_fill', repeat: 2 },
      { id: 3, category: 'rating', icon: 'star_fill', repeat: 3 },
    ] },
    { key: 'language', name: '字体语言', extraTag: 1, tags: [
      { id: 1, category: 'language', name: '简体' },
      { id: 2, category: 'language', name: '繁体' },
      { id: 3, category: 'language', name: 'English' },
      { id: 4, category: 'language', name: '日文' },
    ] },
    { key: 'commercial', name: '授权类型', extraTag: 1, tags: [
      { id: 1, category: 'commercial', name: '免费商用' },
      { id: 2, category: 'commercial', name: '商用需授权' },
    ] },
    { key: 'type', name: '字体类型', extraTag: 1, tags: [
      { id: 1, category: 'type', name: '黑体' },
      { id: 2, category: 'type', name: '毛笔书法' },
      { id: 3, category: 'type', name: '卡通可爱' },
    ] },
    { key: 'style', name: '字体风格', extraTag: 1, tags: [
      { id: 1, category: 'style', name: '创意' },
      { id: 2, category: 'style', name: '中国风' },
      { id: 3, category: 'style', name: '时尚' },
    ] },
  ],
  presets: {},
  commercials: ['MiSans', 'OPPOSans'],
}

export async function getClassification(): Promise<Classification> {
  try {
    const text = await readTextSmart(`${userDir()}/${FILE}`)
    if (!text) return MOCK
    const raw = JSON.parse(text) as {
      categories?: Record<string, Omit<Category, 'key'>>
      presets?: Record<string, Record<string, number[]>>
    }
    const categories: Category[] = []
    for (const key of ORDER) {
      const item = raw.categories?.[key]
      if (!item || !Array.isArray(item.tags)) continue
      categories.push({ key, name: item.name ?? key, extraTag: item.extraTag, tags: item.tags })
    }
    return {
      categories: categories.length ? categories : MOCK.categories,
      presets: raw.presets ?? {},
      commercials: Array.isArray((raw as { commercials?: string[] }).commercials)
        ? ((raw as { commercials?: string[] }).commercials as string[])
        : [],
    }
  } catch {
    return MOCK
  }
}

/** 选中的筛选条件：{ 分类key: [标签id] } */
export type FilterState = Record<string, number[]>

/** 字体语言：按名称判断中英（和 stores/font.ts 的 familyLang 同规则） */
function isChinese(family: string): boolean {
  return /[\u4e00-\u9fa5]/.test(family)
}

/**
 * 字体是否通过筛选。组间 AND、组内 OR。
 *
 * 注意：`presets`（类型/风格/评分）只覆盖云端字体（1178 条，全是尔雅/字魂这类），
 * 系统字体一条都没有 —— 所以那几组对本地字体天然不生效。
 * 语言和授权类型有独立数据源，能真正过滤。
 */
export function matchFilter(family: string, state: FilterState, data: Classification): boolean {
  const active = Object.entries(state).filter(([, ids]) => ids.length > 0)
  if (!active.length) return true

  return active.every(([key, ids]) => {
    if (key === 'language') {
      // 1 简体/2 繁体 都算中文，3 English，4 日文
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
