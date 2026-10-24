import type { FontItem } from './font-item'

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v))
  if (typeof value === 'string') return [value]
  return []
}

/** 兼容两套键名：family/weights/names/postScriptNames 与 name/zz/mz/hjm。 */
export function normalizeFont(item: unknown): FontItem | null {
  if (!item || typeof item !== 'object') return null
  const f = item as Record<string, unknown>

  const family = typeof f.family === 'string' ? f.family : typeof f.name === 'string' ? f.name : ''
  if (!family) return null

  return {
    family,
    weights: asArray(f.weights ?? f.zz),
    names: asArray(f.names ?? f.mz),
    postScriptNames: asArray(f.postScriptNames ?? f.hjm),
    star: typeof f.star === 'number' ? f.star : 0,
  }
}

export function normalizeFontList(raw: unknown): FontItem[] {
  if (!Array.isArray(raw)) return []
  const out: FontItem[] = []
  for (const item of raw) {
    const font = normalizeFont(item)
    if (font) out.push(font)
  }
  return out
}
