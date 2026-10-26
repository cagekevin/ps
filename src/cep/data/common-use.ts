// 是什么：常用页数据仓库——`%APPDATA%/SheJiZhuLi/sj_commonFunction.json` 的唯一读写入口
// 唯一入口：该文件的读写只经过这里；命令层（`commands/commonUse.ts`）调这些方法，页面只读投影
// 替代了什么：原版存储类单例 `Lt`（`app.v4.js:11088-11108`）+ App 根的 deep watch 整份重写（`:16887-16893`）
// 谁在用：`commands/commonUse.ts`（T-86）、`stores/common-use.ts`（T-87）
// 禁止：把页面视图字段（`created`）写回文件；用 fallback 覆盖已有文件；在读坏时建种子

import { hasCep } from '@/cep/transport'
import { readRepoFile } from './repo-read'
import { userDir } from '@/cep/paths'
import { DATA_FILES } from '@/cep/env'
import {
  createCommonUseSeed,
  createEmptyCommonUseFile,
  decodeCommonUseFile,
  findCommonUseIndex,
  toCommonUseItems,
  type CommonUseFile,
  type CommonUseItem,
} from '@/domain/common-use'
import { applyListDrop, type DropPosition } from '@/domain/reorder'
import { shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'
import { CepError } from '@/utils/errors'
import { isRecord } from '@/utils/guards'
import { msg } from '@/domain/messages'
import { dataRepo } from './data-repo'
import type { Repo, RepoRead } from './types'
import type { CasMode } from '@/cep/disk-write'

/** 文件名与路径都来自 `env.ts` 的 `DATA_FILES`（唯一来源；原版 `app.v4.js:5218`） */
const FILE_NAME = DATA_FILES.cyCommonFunction

const resolvePath = (): string => `${userDir()}/${FILE_NAME}`

/**
 * `requireExisting: true`（与 `legacy-settings.ts` 同一口径，D-20）：
 * `update` 读不到文件直接报 `IO`，**绝不**用 fallback 覆盖用户文件。
 */
const base: Repo<CommonUseFile> = dataRepo(
  resolvePath,
  createEmptyCommonUseFile,
  decodeCommonUseFile,
  { requireExisting: true },
)

/** 内存（无 CEP / dev）下 `ensure()` 只建一次；文件模式下由磁盘内容判定，不用这个 */
let memoryEnsured = false

export interface EnsureResult {
  /** true = 这次真的写了种子；false = 文件已存在，什么都没动 */
  created: boolean
}

/**
 * 首建：**只在文件确实不存在时**写一份官方种子。
 *
 * 三态，一个都不能省（ADR-22）：
 * 1. 不存在（读到 `null`）→ 写种子，返回 `created: true`；
 * 2. 读失败（抛错）/ 内容不是合法 JSON / `info` 不是数组 → **抛 `IO`，一个字节都不写**；
 * 3. 已存在且形状正常 → 什么都不做，`created: false`。
 *
 * 为什么不照抄官方：官方父类拿 `readToObject()` 当空对象、构造函数里 `keys(r).length === 0` 就
 * `updata()`（`app.8565afb8.js` 模块 `4058`），于是**文件坏了会被默认值覆盖**——那是 P0 丢数据。
 */
export function ensureCommonUseFile(): EnsureResult {
  if (!hasCep()) {
    // 无 CEP（浏览器 / jsdom）：内存仓库没有"文件不存在"这个概念，按"进程内首次"算
    if (memoryEnsured) return { created: false }
    memoryEnsured = true
    // 种子只在"文件确实不存在"时写 ⇒ `expected: null` = 「这个路径上应当没有文件」
    base.replace(createCommonUseSeed(), { mode: 'compare', expected: null })
    return { created: true }
  }

  // 档 1 的唯一入口，**不折叠**：这条路上"查不到"要写种子、"读不到"要拒写，
  // 两者后果相反，折成默认值就分不出来了（T-107 就是这条分支以前从没跑到过）
  const outcome = readRepoFile(resolvePath(), decodeCommonUseRoot)

  // 查不到 = 首次使用，写种子（`requireExisting` 在这条路上是"文件确实没有"，不是"读不出"）
  if (outcome.kind === 'absent') {
    // 种子只在"文件确实不存在"时写 ⇒ `expected: null` = 「这个路径上应当没有文件」
    base.replace(createCommonUseSeed(), { mode: 'compare', expected: null })
    return { created: true }
  }

  // 读不到 / 不是合法 JSON / 根不是数组：三种都拒绝写，但三句文案不同（用户下一步动作不同）
  if (outcome.kind === 'bad') {
    throw outcome.why === 'readError'
      ? new CepError('IO', msg.data.fn.commonUseReadFailedRefuseWrite(FILE_NAME))
      : outcome.why === 'notJson'
        ? new CepError('IO', msg.data.fn.commonUseNotJsonRefuse(FILE_NAME))
        : new CepError('IO', msg.data.fn.commonUseRootNotArrayRefuse(FILE_NAME))
  }
  return { created: false }
}

/**
 * 常用项文件的 decode：根必须是数组，或旧形状 `{ info: [...] }`。
 *
 * 根为数组是官方形状（`configReset()` 返回数组、`updata()` 直接 stringify 它，`:11112` / `:6401`）；
 * `{ info: [...] }` 是我们自己写错的历史文件 —— 读得懂、下次写会归一成数组。
 * 判据即证明（`isRecord` + 字段访问）⇒ 不 `as` 断言。
 */
function decodeCommonUseRoot(raw: unknown): Decoded<unknown> | DecodeFail {
  if (Array.isArray(raw)) return { value: raw }
  if (isRecord(raw) && Array.isArray(raw.info)) return { value: raw }
  return shapeFail('', 'array', raw)
}

/**
 * 在 `update` 的 mutator 里取可写数组：形状不对直接抛，不兜底。
 * 返回的就是文件里那个数组本体（不是拷贝），所以原地 `splice` 能落回文件里。
 *
 * **mutator 必须 `return items`**（不是 `return file`）：写回一律归一成裸数组，
 * 旧形状 `{ info: [...] }` 在第一次写入时就被转正（官方只认数组，`:6401`）。
 */
function requireItems(file: unknown): CommonUseItem[] {
  // 解包判据只有一份：`domain/common-use.toCommonUseItems`（读边界与写路径共用同一条）
  const items = toCommonUseItems(file)
  if (items === null)
    throw new CepError('PARSE', msg.data.fn.commonUseRootNotArrayRewrite(FILE_NAME))
  return items
}

/**
 * 排序：**复用** `domain/reorder.applyListDrop`（原版拖拽四分支的落点计算，`:37786-37796`），
 * 不在这里另写一份下标运算。`position` 是"插在目标前/后"。
 */
function move(from: number, to: number, position: DropPosition): CommonUseFile {
  return base.update((file) => {
    const items = requireItems(file)
    applyListDrop(items, from, to, position)
    return items
  })
}

/** 显隐：只改这一项的 `isShow`，不动顺序 */
function setShow(id: string, show: boolean): CommonUseFile {
  return base.update((file) => {
    const items = requireItems(file)
    const index = findCommonUseIndex(items, id)
    if (index < 0) throw new CepError('PARSE', msg.data.fn.commonUseItemMissing(id))
    items[index].isShow = show
    return items
  })
}

/**
 * 恢复默认（官方 `resetConfig()`：全清 + 重新 push 种子 + 整份 `updata`，`:11101-11108`）。
 * **只换 `info`，文件顶层的未知键原样保留**——官方也写这个文件，整份替换等于删他的字段。
 */
function resetAll(): CommonUseFile {
  return base.update((file) => {
    const items = requireItems(file)
    // 官方 `resetConfig()`：`splice(0, length)` 后 `push(...configReset())`（`:11105-11106`），原地换内容
    items.splice(0, items.length, ...createCommonUseSeed())
    return items
  })
}

export const commonUseRepo = {
  read: (): RepoRead<CommonUseFile> => base.read(),

  // 订阅**不自己实现**：`fileRepo` / `memoryRepo` 本来就有 `onChange` + 监听表，
  // 这层再包一遍就是同一事件两套总线。
  replace: (value: CommonUseFile, cas: CasMode): void => base.replace(value, cas),
  update: (mutator: (value: CommonUseFile) => CommonUseFile | void): CommonUseFile =>
    base.update(mutator),
  onChange: (listener: (value: CommonUseFile) => void): (() => void) => base.onChange(listener),

  ensure: ensureCommonUseFile,
  move,
  setShow,
  resetAll,
}

export type CommonUseRepo = typeof commonUseRepo
