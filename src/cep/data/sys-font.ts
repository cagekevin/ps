import { DATA_FILES } from '@/cep/env'
import { hasCep } from '@/cep/transport'
import { readTextOutcome, userDir } from '@/cep/fs'
import { normalizeFontList } from '@/domain/font-normalize'
import type { SysFontFile } from '@/cep/types'
import type { FontItem } from '@/domain/font-item'
import { log } from '@/utils/logger'
import { readFontStars } from './font-meta'

/**
 * 把收藏等级合并进去。
 *
 * 星级读不到时**不动列表**（评分按 0 显示），但读不到这件事由 `useFontStore.loadStars`
 * 单独报给用户——列表能不能显示和评分读不读得到是两件事，不能因为后者失败让列表空掉。
 */
export async function mergeFontStars(list: FontItem[]): Promise<FontItem[]> {
  const read = await readFontStars()
  if (!read.ok || !Object.keys(read.stars).length) return list
  return list.map((f) => ({ ...f, star: read.stars[f.family] ?? 0 }))
}

/**
 * SysFont2.json 的读取**观测**（TD-09-3）。
 *
 * 三态而不是 `FontItem[]`：空数组同时表示"文件不在（首次使用）""读不到""解析失败"，
 * 而这三件事用户看到的是三种不同结论——`[]` 一折，页面只会显示"没有系统字体"。
 * 与 `LedgerRead` / `TextRead` 同一判据：原语报观测，结论由调用方下（ADR-0026 ②）。
 */
export type SysFontRead =
  | { status: 'ok'; list: FontItem[] }
  /** 文件不在：首次使用 / 还没生成，不是失败 */
  | { status: 'none' }
  /** 读不到或读不懂：**调用方不许当成"没有字体"** */
  | { status: 'error'; reason: string }

/** 读 SysFont2.json；浏览器没有 userDir，按"文件不在"处理（不是失败） */
export async function readSysFontFile(): Promise<SysFontRead> {
  if (!hasCep()) return { status: 'none' }
  const abs = `${userDir()}/${DATA_FILES.sysFontList}`
  const read = await readTextOutcome(abs)

  if (read.status === 'error') {
    log.warn('sys-font', `${abs} 读不到`, read.reason)
    return { status: 'error', reason: read.reason }
  }
  if (read.status === 'notSeen' || !read.text) return { status: 'none' }

  try {
    const file = JSON.parse(read.text) as SysFontFile
    return { status: 'ok', list: await mergeFontStars(normalizeFontList(file.arr)) }
  } catch (e) {
    // 坏 JSON / 结构不认识：这是失败，不是"没有系统字体"
    log.warn('sys-font', `${abs} 解析失败`, e)
    return { status: 'error', reason: '内容读不懂（不是合法 JSON 或结构不符）' }
  }
}
