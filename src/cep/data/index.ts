import tagsSeed from '@/mocks/font-tags.json'
import { DATA_FILES } from '@/cep/env'
import { userDir } from '@/cep/paths'
import { isRecord } from '@/utils/guards'
import { decodeList } from '@/utils/decode'
import { dataRepo } from './data-repo'
import type { Repo, RepoView } from './types'
import { deepClone } from '@/utils/clone'

/** 标签文件的原始形状（原面板字段名不改，见 ADR-05） */
export interface RawTag {
  text?: string
  arr?: string[]
  xz?: boolean
}

/** 星级文件形状；`star` 在原文件里既有数字也有字符串 */
export interface RawStar {
  name?: string
  star?: string | number
}

/** dev seed 必须深拷贝：memoryRepo 会直接改传入的对象，不能污染模块级数据 */
const clone = deepClone

/** 只有浏览器 dev 会用到这个种子；CEP 里读的是真实文件 */
const starsSeed: RawStar[] = [
  { name: 'MiSans', star: 3 },
  { name: 'Didot', star: 2 },
]

/**
 * 标签 / 星级：条目字段全可选（原面板字段名不改，ADR-05）⇒ 条目级只证"是对象"。
 *
 * **导出**是因为云同步入口（`cloud/entries/font-tags|font-stars`）也要用它把
 * `JSON.parse` 的 `unknown[]` 收窄成 `RawTag[]` / `RawStar[]`——同一份证明只留这一处。
 */
export const isRawTag = (x: unknown): x is RawTag => isRecord(x)
export const isRawStar = (x: unknown): x is RawStar => isRecord(x)

const tagsImpl: Repo<RawTag[]> = dataRepo(
  () => `${userDir()}/${DATA_FILES.ztglTags}`,
  () => [],
  (raw) => decodeList(raw, isRawTag),
  { seed: () => clone<RawTag[]>(tagsSeed) },
)

const starsImpl: Repo<RawStar[]> = dataRepo(
  () => `${userDir()}/${DATA_FILES.ztglStar}`,
  () => [],
  (raw) => decodeList(raw, isRawStar),
  { seed: () => clone<RawStar[]>(starsSeed) },
)

/** 只读视图（store 唯一能拿到的形状）：没有 write / update —— 调用不到 */
export const tagsRepo: RepoView<RawTag[]> = tagsImpl
export const starsRepo: RepoView<RawStar[]> = starsImpl

/** 写侧句柄：只给 commands/registry 的 ctx.data 与 cloud 同步用；store 里出现即违规（eslint） */
export const tagsWriter: Repo<RawTag[]> = tagsImpl
export const starsWriter: Repo<RawStar[]> = starsImpl

export { dataRepo } from './data-repo'
export type { Repo, RepoRead, RepoView } from './types'
