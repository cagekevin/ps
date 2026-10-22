import type { FontTag } from '@/cep/types'
import { starsRepo, tagsRepo } from './index'

/** 读字体标签（我的标签那一排） */
export async function readFontTags(): Promise<FontTag[]> {
  const { value: raw } = await tagsRepo.read()
  return raw
    .filter((item) => typeof item.text === 'string')
    .map((item) => ({
      text: item.text as string,
      arr: Array.isArray(item.arr) ? item.arr : [],
      xz: item.xz === true,
    }))
}

/** 读星级：{ 家族名: 1~3 } */
export async function readFontStars(): Promise<Record<string, number>> {
  const { value: raw } = await starsRepo.read()
  const map: Record<string, number> = {}
  for (const item of raw) {
    if (typeof item.name !== 'string') continue
    const value = Number(item.star)
    if (value > 0) map[item.name] = value
  }
  return map
}
