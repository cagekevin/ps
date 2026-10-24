import type { FontTag } from '@/cep/types'
import { starsRepo, tagsRepo } from './index'
import { readOr } from './read-or'

/** 读字体标签（我的标签那一排）；坏文件按空列表展示，坏因进日志（清单 §二，`readOr`） */
export async function readFontTags(): Promise<FontTag[]> {
  const raw = readOr(await tagsRepo.read(), [], 'font-meta.tags')
  return raw
    .filter((item) => typeof item.text === 'string')
    .map((item) => ({
      text: item.text as string,
      arr: Array.isArray(item.arr) ? item.arr : [],
      xz: item.xz === true,
    }))
}

/** 读星级：{ 家族名: 1~3 }；坏文件按"全未收藏"展示，坏因进日志（清单 §二，`readOr`） */
export async function readFontStars(): Promise<Record<string, number>> {
  const raw = readOr(await starsRepo.read(), [], 'font-meta.stars')
  const map: Record<string, number> = {}
  for (const item of raw) {
    if (typeof item.name !== 'string') continue
    const value = Number(item.star)
    if (value > 0) map[item.name] = value
  }
  return map
}
