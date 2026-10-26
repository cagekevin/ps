import type { FontItem } from './font-item'
import { keepDecoded, shapeFail, type Decoded, type DecodeFail } from '@/utils/decode'
import { isRecord } from '@/utils/guards'

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v))
  if (typeof value === 'string') return [value]
  return []
}

/** 兼容两套键名：family/weights/names/postScriptNames 与 name/zz/mz/hjm。 */
export function normalizeFont(item: unknown): Decoded<FontItem> | DecodeFail {
  if (!isRecord(item)) return shapeFail('', 'object', item)

  const family =
    typeof item.family === 'string' ? item.family : typeof item.name === 'string' ? item.name : ''
  if (!family) return shapeFail('family', 'string', item.family)

  return {
    value: {
      family,
      weights: asArray(item.weights ?? item.zz),
      names: asArray(item.names ?? item.mz),
      postScriptNames: asArray(item.postScriptNames ?? item.hjm),
      star: typeof item.star === 'number' ? item.star : 0,
    },
  }
}

/** 列表归一：**坏项丢掉、其余照常**（"丢"的写法只有 `keepDecoded` 这一份） */
export function normalizeFontList(raw: unknown): FontItem[] {
  if (!Array.isArray(raw)) return []
  return keepDecoded(raw.map(normalizeFont))
}
