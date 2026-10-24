import { DATA_FILES } from '@/cep/env'
import { hasCep } from '@/cep/transport'
import { readTextOutcome, userDir } from '@/cep/fs'
import { normalizeFontList } from '@/domain/font-normalize'
import type { SysFontFile } from '@/cep/types'
import type { FontItem } from '@/domain/font-item'
import { log } from '@/utils/logger'
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
  const read = await readTextOutcome(abs)
  // T-107 **已知欠账**：读失败这里仍返回空列表（"没有系统字体"），与"查不到"同果——
  // 字体管理页会显示空列表而不是"读盘失败"。补信号要改页面，另开条目
  if (read.status === 'error') {
    log.warn('sys-font', `${abs} 读不到，按无系统字体处理`, read.reason)
    return []
  }
  if (read.status === 'notSeen' || !read.text) return []
  try {
    const file = JSON.parse(read.text) as SysFontFile
    return await mergeFontStars(normalizeFontList(file.arr))
  } catch {
    return []
  }
}
