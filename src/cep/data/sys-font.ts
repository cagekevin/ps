import { DATA_FILES } from '@/cep/env'
import { hasCep } from '@/cep/transport'
import { readTextSmart, userDir } from '@/cep/fs'
import { normalizeFontList } from '@/domain/font-normalize'
import type { FontItem, SysFontFile } from '@/cep/types'
import { readFontStars } from './font-meta'

/** 把收藏等级合并进去（缺文件就当全是 0） */
export async function mergeFontStars(list: FontItem[]): Promise<FontItem[]> {
  const stars = await readFontStars()
  if (!Object.keys(stars).length) return list
  return list.map((f) => ({ ...f, star: stars[f.family] ?? 0 }))
}

/** 读 SysFont2.json；浏览器没有 userDir，直接当读不到 */
export async function readSysFontFile(): Promise<FontItem[]> {
  if (!hasCep()) return []
  const abs = `${userDir()}/${DATA_FILES.sysFontList}`
  const text = await readTextSmart(abs)
  if (!text) return []
  try {
    const file = JSON.parse(text) as SysFontFile
    return await mergeFontStars(normalizeFontList(file.arr))
  } catch {
    return []
  }
}
