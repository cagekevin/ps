import type { FontTag } from '@/cep/types'
import { starsRepo, tagsRepo } from './index'
import type { RepoRead } from './types'

/**
 * 读字体标签（我的标签那一排）。
 *
 * 返回 `RepoRead` 而不是 `FontTag[]`：后者把"一个标签都没有"和"读不到"压成同一个空列表，
 * 调用方分不出，只能显示成"你没有标签"——**把我们的故障说成用户的数据**。
 * `ok:false` 分支上**没有 `.value`** ⇒ 不处理就编译不过（ADR-14）。
 */
export function readFontTags(): RepoRead<FontTag[]> {
  const read = tagsRepo.read()
  if (!read.ok) return { ok: false, reason: read.reason, fallback: [] }

  return {
    ok: true,
    value: read.value
      .filter((item) => typeof item.text === 'string')
      .map((item) => ({
        text: item.text as string,
        arr: Array.isArray(item.arr) ? item.arr : [],
        xz: item.xz === true,
      })),
  }
}

/**
 * 读星级：`{ 家族名: 1~3 }`。
 *
 * 返回 `RepoRead` 而不是「值 + 可忽略的 `ok` 字段」：`{}` 同时表示"一个都没收藏"和"读不到"，
 * 而这两件事用户看到的是两种完全不同的结论（前者是他的数据，后者是我们的故障）。
 * 判别联合让失败**在类型上取不到值**，吞不掉（ADR-14 ADR-0026 ②）。
 */
export function readFontStars(): RepoRead<Record<string, number>> {
  const read = starsRepo.read()
  if (!read.ok) return { ok: false, reason: read.reason, fallback: {} }

  const map: Record<string, number> = {}
  for (const item of read.value) {
    if (typeof item.name !== 'string') continue
    const value = Number(item.star)
    if (value > 0) map[item.name] = value
  }
  return { ok: true, value: map }
}
