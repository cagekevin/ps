import { userDir } from '@/cep/paths'
import { DATA_FILES } from '@/cep/env'
import { hasCep } from '@/cep/transport'
import { isRecord, isUnknownArray } from '@/utils/guards'
import { foldAbsent, readRepoFile } from './repo-read'
import type { DecodeFail, Decoded } from '@/utils/decode'
import type { RepoRead } from './types'

/**
 * 字体分类数据（原版 `%APPDATA%\SheJiZhuLi\classification.json`）。
 *
 * 只负责**读**与归一化；筛选规则在 `domain/font-filter.ts`（纯函数，可单测）。
 *
 * ADR-14：CEP 里读失败**不许**用 MOCK 冒充真数据——
 * MOCK 只有 2 条 commercials，会让"免费商用"筛出错的结果。只返回 degraded。
 */
import { toCategoryTags, type Category, type Classification } from '@/domain/classification'

export type { Category, CategoryTag, Classification } from '@/domain/classification'

/** 分类顺序按原版面板的展示顺序 */
const ORDER = ['rating', 'language', 'commercial', 'type', 'style']

/** 仅浏览器 dev 使用；CEP 里永远不返回它 */
const MOCK: Classification = {
  categories: [
    {
      key: 'rating',
      name: '评分',
      tags: [
        { id: 1, category: 'rating', icon: 'star_fill', repeat: 1 },
        { id: 2, category: 'rating', icon: 'star_fill', repeat: 2 },
        { id: 3, category: 'rating', icon: 'star_fill', repeat: 3 },
      ],
    },
    {
      key: 'language',
      name: '字体语言',
      extraTag: 1,
      tags: [
        { id: 1, category: 'language', name: '简体' },
        { id: 2, category: 'language', name: '繁体' },
        { id: 3, category: 'language', name: 'English' },
        { id: 4, category: 'language', name: '日文' },
      ],
    },
    {
      key: 'commercial',
      name: '授权类型',
      extraTag: 1,
      tags: [
        { id: 1, category: 'commercial', name: '免费商用' },
        { id: 2, category: 'commercial', name: '商用需授权' },
      ],
    },
    {
      key: 'type',
      name: '字体类型',
      extraTag: 1,
      tags: [
        { id: 1, category: 'type', name: '黑体' },
        { id: 2, category: 'type', name: '毛笔书法' },
        { id: 3, category: 'type', name: '卡通可爱' },
      ],
    },
    {
      key: 'style',
      name: '字体风格',
      extraTag: 1,
      tags: [
        { id: 1, category: 'style', name: '创意' },
        { id: 2, category: 'style', name: '中国风' },
        { id: 3, category: 'style', name: '时尚' },
      ],
    },
  ],
  presets: {},
  commercials: ['MiSans', 'OPPOSans'],
}

export function emptyClassification(): Classification {
  return { categories: [], presets: {}, commercials: [] }
}

export function getClassification(): RepoRead<Classification> {
  // dev：浏览器里没有真实文件，用 MOCK 才能开发 UI
  if (!hasCep()) return { ok: true, value: MOCK }

  const abs = `${userDir()}/${DATA_FILES.classification}`
  // 档 1 的唯一结论入口（三态 → JSON → decode → RepoRead）。判据不在本文件里。
  const outcome = readRepoFile(abs, decodeClassification)
  // 读不到（`text === null`）与"读到了但读不懂"是两句不同的话，不许合并（T-107）
  if (outcome.kind === 'bad') {
    return outcome.why === 'readError'
      ? { ok: false, reason: '分类数据读取失败', fallback: emptyClassification() }
      : { ok: false, reason: '分类数据格式不正确', fallback: emptyClassification() }
  }
  // 这个文件不随面板分发（`getClassificationURL` → `v1/font/link`，`:49501`），
  // 新机器上第一次用确实没有 —— `ok:true` 但**必须留 reason**，去掉就是静默回退（20(b)）
  return foldAbsent(outcome, emptyClassification, { notSeenReason: '分类数据文件不存在' })
}

/**
 * `classification.json` 的 decode。
 *
 * 逐条不许丢：某个分组结构不认识就**跳过那一个分组**（不是整份拒绝）—— 这是原实现的语义，
 * 因为 `presets` / `commercials` 与分组无关，整份拒绝会让"免费商用"筛选一起空。
 * 顶层不是对象则整份拒绝（`null`），因为那时连 `presets` 都没有可信来源。
 */
function decodeClassification(raw: unknown): Decoded<Classification> | DecodeFail | null {
  if (!isRecord(raw)) return null

  const rawCategories = isRecord(raw.categories) ? raw.categories : {}
  const categories: Category[] = []
  for (const key of ORDER) {
    const item = rawCategories[key]
    if (!isRecord(item) || !isUnknownArray(item.tags)) continue
    categories.push({
      key,
      name: typeof item.name === 'string' ? item.name : key,
      extraTag: typeof item.extraTag === 'number' ? item.extraTag : undefined,
      tags: toCategoryTags(item.tags),
    })
  }

  const presets: Record<string, Record<string, number[]>> = {}
  if (isRecord(raw.presets)) {
    for (const [name, groups] of Object.entries(raw.presets)) {
      if (!isRecord(groups)) continue
      const bucket: Record<string, number[]> = {}
      for (const [k, arr] of Object.entries(groups)) {
        if (isUnknownArray(arr)) bucket[k] = arr.filter((n): n is number => typeof n === 'number')
      }
      presets[name] = bucket
    }
  }

  // 文件是合法 JSON，只是分组为空：`presets` / `commercials` 仍然可用 ⇒ 值可用但不完整（degraded）
  return {
    value: {
      categories,
      presets,
      commercials: isUnknownArray(raw.commercials)
        ? raw.commercials.filter((c): c is string => typeof c === 'string')
        : [],
    },
    degraded: categories.length ? undefined : '分类数据里没有可用分组',
  }
}
