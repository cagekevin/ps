import { DATA_FILES } from '@/cep/env'
import { hasCep } from '@/cep/transport'
import { userDir } from '@/cep/paths'
import { normalizeFontList } from '@/domain/font-normalize'
import { isRecord } from '@/utils/guards'
import type { FontItem } from '@/domain/font-item'
import { readRepoFile } from './repo-read'
import { shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'
import { readFontStars } from './font-meta'

/**
 * 把收藏等级合并进去。
 *
 * 星级读不到时**不动列表**（评分按 0 显示），但读不到这件事由 `useFontStore.loadStars`
 * 单独报给用户——列表能不能显示和评分读不读得到是两件事，不能因为后者失败让列表空掉。
 */
export function mergeFontStars(list: FontItem[]): FontItem[] {
  const read = readFontStars()
  // 读不到星级**不动列表**（评分按 0 显示），但"读不到"这件事由 `useFontStore.loadStars`
  // 单独报给用户 —— 列表能不能显示和评分读不读得到是两件事。
  if (!read.ok || !Object.keys(read.value).length) return list
  return list.map((f) => ({ ...f, star: read.value[f.family] ?? 0 }))
}

/**
 * SysFont2.json 的读取**观测**。
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

/**
 * `SysFont2.json` 的 decode。
 *
 * 不许 `as SysFontFile`：`as` 之后 `file.arr` 恒可信，坏形状会漏过去变成"没有系统字体"（静默）。
 * 判据即证明：`isRecord` + `Array.isArray` ⇒ 不转型。
 */
function decodeSysFont(raw: unknown): Decoded<unknown[]> | DecodeFail {
  if (!isRecord(raw)) return shapeFail('', 'object', raw)
  if (!Array.isArray(raw.arr)) return shapeFail('arr', 'array', raw.arr)
  return { value: raw.arr }
}

/** 读 SysFont2.json；浏览器没有 userDir，按"文件不在"处理（不是失败） */
export function readSysFontFile(): SysFontRead {
  if (!hasCep()) return { status: 'none' }
  const abs = `${userDir()}/${DATA_FILES.sysFontList}`

  // 档 1 的唯一入口，**不折叠**：这个文件没有默认值 ——
  // "文件不在"（还没生成过）与"读不到"是两种结论，拿 `[]` 顶上去就会显示"没有系统字体"
  const outcome = readRepoFile(abs, decodeSysFont)
  if (outcome.kind === 'absent') return { status: 'none' }
  if (outcome.kind === 'bad') {
    // 空文件按"还没生成"处理（原实现如此：零字节 SysFont2.json 不是坏文件）
    if (outcome.text === '') return { status: 'none' }
    // 读不到报原始原因；读到了但读不懂报固定那句 —— 文案保持原样
    return {
      status: 'error',
      reason:
        outcome.why === 'readError' ? outcome.reason : '内容读不懂（不是合法 JSON 或结构不符）',
    }
  }
  return { status: 'ok', list: mergeFontStars(normalizeFontList(outcome.value)) }
}
