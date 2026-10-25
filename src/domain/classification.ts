/**
 * 分类数据的**类型**（无 IO）。
 *
 * 为什么与 `cep/data/classification-repo.ts` 分开：页面只允许依赖领域类型，
 * 不允许直接碰数据实现（ADR-16 护栏）。类型放这里，读取放 data/。
 */

import { isRecord } from '@/utils/guards'

/**
 * 磁盘上的 `tags` → `CategoryTag[]`（**唯一实现**，形状证明放在类型所在的域，不放 data 层）。
 *
 * 逐字段证明：`id` 必须是数字、`category` 必须是字符串，其余可选字段只在类型对时才带。
 * 坏条目**丢弃**（本仓库只读、不回写，丢弃不会造成数据丢失）。
 *
 * 怎么用：`cep/data/classification-repo.ts` 读到 `unknown` 后调它，**不要**再写
 * `item.tags as CategoryTag[]` 或在 data 层另写一份同样的逐字段判断。
 */
export function toCategoryTags(raw: unknown[]): CategoryTag[] {
  const out: CategoryTag[] = []
  for (const tag of raw) {
    if (!isRecord(tag) || typeof tag.id !== 'number' || typeof tag.category !== 'string') continue
    out.push({
      id: tag.id,
      category: tag.category,
      name: typeof tag.name === 'string' ? tag.name : undefined,
      icon: typeof tag.icon === 'string' ? tag.icon : undefined,
      repeat: typeof tag.repeat === 'number' ? tag.repeat : undefined,
    })
  }
  return out
}

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
