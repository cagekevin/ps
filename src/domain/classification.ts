/**
 * 分类数据的**类型**（无 IO）。
 *
 * 为什么与 `cep/data/classification-repo.ts` 分开：页面只允许依赖领域类型，
 * 不允许直接碰数据实现（ADR-16 护栏）。类型放这里，读取放 data/。
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
  /** 免费商用字体名单 */
  commercials: string[]
}
