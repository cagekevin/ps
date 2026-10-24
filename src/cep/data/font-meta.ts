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

/**
 * 星级读取的**观测**（TD-01-4）。
 *
 * 为什么不是一个裸 map：`{}` 同时表示"一个都没收藏"和"读不到"，而这两件事用户看到的是
 * 两种完全不同的结论（前者是他的数据，后者是我们的故障）。原语只报观测，结论由调用方下
 * （ADR-0026 ②）：`ok:false` 时页面必须显示"读不到"，不许显示成"未收藏"。
 */
export interface FontStarsRead {
  ok: boolean
  /** ok 时是 { 家族名: 1~3 }；不 ok 时是空表，**不是**"全未收藏"这个结论 */
  stars: Record<string, number>
  /** 不 ok 的原因原文（读不到 / 坏 JSON / 结构不认识） */
  reason?: string
}

/** 读星级：{ 家族名: 1~3 }；读不到时 `ok:false` + 原因，不伪装成空表 */
export async function readFontStars(): Promise<FontStarsRead> {
  const read = await starsRepo.read()
  if (!read.ok) return { ok: false, stars: {}, reason: read.reason }

  const map: Record<string, number> = {}
  for (const item of read.value) {
    if (typeof item.name !== 'string') continue
    const value = Number(item.star)
    if (value > 0) map[item.name] = value
  }
  return { ok: true, stars: map }
}
