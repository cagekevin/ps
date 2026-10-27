import { DATA_FILES } from '@/cep/env'
import { hasCep } from '@/cep/transport'
import { userDir } from '@/cep/paths'
import { normalizeFontList } from '@/domain/font-normalize'
import { isRecord } from '@/utils/guards'
import type { FontItem } from '@/domain/font-item'
import { readRepoFile, type RepoFileOutcome } from './repo-read'
import type { Exists } from '@/utils/exists'
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
  if (read.status !== 'ok' || !Object.keys(read.value).length) return list
  return list.map((f) => ({ ...f, star: read.value[f.family] ?? 0 }))
}

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

/**
 * `RepoFileOutcome` → `Exists` 失败臂的**唯一构造点**（别处只调，不写字面量）。
 *
 * 这个形状**没有 `fallback`** —— 读不到不许顶成"没有字体"（T-114）。
 */
function badSysFont(
  outcome: Extract<RepoFileOutcome<unknown>, { status: 'error' }>,
): Exists<FontItem[]> {
  return outcome.fail === 'readError'
    ? { status: 'error', fail: 'readError', reason: outcome.reason, failure: outcome.failure }
    : { status: 'error', fail: outcome.fail, reason: outcome.reason }
}

/** 读 SysFont2.json；浏览器没有 userDir，按"文件不在"处理（不是失败） */
export function readSysFontFile(): Exists<FontItem[]> {
  if (!hasCep()) return { status: 'notSeen' }
  const abs = `${userDir()}/${DATA_FILES.sysFontList}`

  // 档 1 的唯一入口，**不折叠**：这个文件没有默认值 ——
  // "文件不在"（还没生成过）与"读不到"是两种结论，拿 `[]` 顶上去就会显示"没有系统字体"
  const outcome = readRepoFile(abs, decodeSysFont)
  if (outcome.status === 'notSeen') return { status: 'notSeen' }
  if (outcome.status === 'error') {
    // 空文件按"还没生成"处理（原实现如此：零字节 SysFont2.json 不是坏文件）
    if (outcome.text === '') return { status: 'notSeen' }
    return badSysFont(outcome)
  }
  return { status: 'ok', value: mergeFontStars(normalizeFontList(outcome.value)) }
}
