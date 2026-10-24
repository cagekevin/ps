import type { FontTag } from '@/cep/types'
import { starsRepo, tagsRepo } from './index'

/** 读字体标签（我的标签那一排）；坏文件的默认值取仓库自己的 `fallback`（空列表），坏因由 `fileRepo` 记 */
export async function readFontTags(): Promise<FontTag[]> {
  const read = await tagsRepo.read()
  const raw = read.ok ? read.value : read.fallback
  return raw
    .filter((item) => typeof item.text === 'string')
    .map((item) => ({
      text: item.text as string,
      arr: Array.isArray(item.arr) ? item.arr : [],
      xz: item.xz === true,
    }))
}

/** 读星级：{ 家族名: 1~3 }；坏文件按"全未收藏"展示，坏因由 `fileRepo` 记 */
export async function readFontStars(): Promise<Record<string, number>> {
  const read = await starsRepo.read()
  const raw = read.ok ? read.value : read.fallback
  const map: Record<string, number> = {}
  for (const item of raw) {
    if (typeof item.name !== 'string') continue
    const value = Number(item.star)
    if (value > 0) map[item.name] = value
  }
  return map
}
