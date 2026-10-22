import tagsSeed from '@/mocks/font-tags.json'
import { DATA_FILES } from '@/cep/env'
import { userDir } from '@/cep/fs'
import { pick } from './pick'
import type { Repo } from './types'
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

export const tagsRepo: Repo<RawTag[]> = pick(
  () => `${userDir()}/${DATA_FILES.ztglTags}`,
  () => [],
  () => clone<RawTag[]>(tagsSeed),
)

export const starsRepo: Repo<RawStar[]> = pick(
  () => `${userDir()}/${DATA_FILES.ztglStar}`,
  () => [],
  () => clone<RawStar[]>(starsSeed),
)

export { pick } from './pick'
export type { Repo, RepoRead } from './types'
