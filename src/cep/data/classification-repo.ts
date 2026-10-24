import { readTextOutcome, userDir } from '@/cep/fs'
import { hasCep } from '@/cep/transport'
import { log } from '@/utils/logger'
import type { RepoRead } from './types'

/**
 * 字体分类数据（原版 `%APPDATA%\SheJiZhuLi\classification.json`）。
 *
 * 只负责**读**与归一化；筛选规则在 `domain/font-filter.ts`（纯函数，可单测）。
 *
 * ADR-14：CEP 里读失败**不许**用 MOCK 冒充真数据——
 * MOCK 只有 2 条 commercials，会让"免费商用"筛出错的结果。只返回 degraded。
 */
import type { Category, Classification } from '@/domain/classification'

export type { Category, CategoryTag, Classification } from '@/domain/classification'

/** 分类顺序按原版面板的展示顺序 */
const ORDER = ['rating', 'language', 'commercial', 'type', 'style']

const FILE = 'classification.json'

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

export async function getClassification(): Promise<RepoRead<Classification>> {
  // dev：浏览器里没有真实文件，用 MOCK 才能开发 UI
  if (!hasCep()) return { ok: true, value: MOCK }

  const abs = `${userDir()}/${FILE}`
  const read = await readTextOutcome(abs)

  // 读不到 → 整份不可用。这条分支以前靠 `readTextSmart` 抛错触发，而它从不抛，
  // 所以一次都没跑到过（读失败被当成"文件不存在"）；三态分对后它第一次可达（T-107 / ADR-26 ②）
  if (read.status === 'error') {
    log.warn('classification', `${abs} 读取失败`, read.reason)
    return { ok: false, reason: '分类数据读取失败', fallback: emptyClassification() }
  }

  // 查不到 = 首次使用的正常状态，不是读失败（T-103）。
  // 依据：`file-repo.ts:71-72` 同一条规则；原版 `app.v4.js:45717-45721` 读本地抛 `ENOENT`
  // 时走的是"下载并写回"（`ww`，`:45713`），从不把"没有这个文件"报给用户。
  // 这个文件也不随面板分发（`getClassificationURL` → `v1/font/link`，`:49501`），
  // 所以新机器上第一次用确实没有。值给空分类，`reason` 保留：去掉它就是静默回退（20(b)）。
  if (read.status === 'notSeen') {
    return {
      ok: true,
      value: emptyClassification(),
      reason: '分类数据文件不存在',
    }
  }

  const text = read.text

  try {
    const raw = JSON.parse(text) as {
      categories?: Record<string, Omit<Category, 'key'>>
      presets?: Record<string, Record<string, number[]>>
      commercials?: string[]
    }

    const categories: Category[] = []
    for (const key of ORDER) {
      const item = raw.categories?.[key]
      if (!item || !Array.isArray(item.tags)) continue
      categories.push({ key, name: item.name ?? key, extraTag: item.extraTag, tags: item.tags })
    }

    // 文件是合法 JSON，只是分组为空：`presets` / `commercials` 仍然可用，所以是 `ok: true` + reason，
    // 不是 `ok: false`（丢掉 value 会让"免费商用"筛选一起空）
    return {
      ok: true,
      value: {
        categories,
        presets: raw.presets ?? {},
        commercials: Array.isArray(raw.commercials) ? raw.commercials : [],
      },
      reason: categories.length ? undefined : '分类数据里没有可用分组',
    }
  } catch (e) {
    log.warn('classification', `${abs} 不是合法 JSON`, e)
    return { ok: false, reason: '分类数据格式不正确', fallback: emptyClassification() }
  }
}
