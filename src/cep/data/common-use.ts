// 是什么：常用页数据仓库——`%APPDATA%/SheJiZhuLi/sj_commonFunction.json` 的唯一读写入口
// 唯一入口：该文件的读写只经过这里；命令层（`commands/commonUse.ts`）调这些方法，页面只读投影
// 替代了什么：原版存储类单例 `Lt`（`app.v4.js:11088-11108`）+ App 根的 deep watch 整份重写（`:16887-16893`）
// 谁在用：`commands/commonUse.ts`（T-86）、`stores/common-use.ts`（T-87）
// 禁止：把页面视图字段（`created`）写回文件；用 fallback 覆盖已有文件；在读坏时建种子

import { hasCep } from '@/cep/transport'
import { readTextSmart, userDir } from '@/cep/fs'
import { DATA_FILES } from '@/cep/env'
import {
  createCommonUseSeed,
  createEmptyCommonUseFile,
  findCommonUseIndex,
  type CommonUseFile,
} from '@/domain/common-use'
import { applyListDrop, type DropPosition } from '@/domain/reorder'
import { CepError } from '@/utils/errors'
import { pick } from './pick'
import type { Repo, RepoRead } from './types'

/** 文件名与路径都来自 `env.ts` 的 `DATA_FILES`（唯一来源；原版 `app.v4.js:5218`） */
const FILE_NAME = DATA_FILES.cyCommonFunction

const resolvePath = (): string => `${userDir()}/${FILE_NAME}`

/**
 * `requireExisting: true`（与 `legacy-settings.ts` 同一口径，D-20）：
 * `update` 读不到文件直接报 `IO`，**绝不**用 fallback 覆盖用户文件。
 */
const base: Repo<CommonUseFile> = pick(
  resolvePath,
  createEmptyCommonUseFile,
  createEmptyCommonUseFile,
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
export async function ensureCommonUseFile(): Promise<EnsureResult> {
  if (!hasCep()) {
    // 无 CEP（浏览器 / jsdom）：内存仓库没有"文件不存在"这个概念，按"进程内首次"算
    if (memoryEnsured) return { created: false }
    memoryEnsured = true
    await base.write(createCommonUseSeed())
    return { created: true }
  }

  let text: string | null
  try {
    text = await readTextSmart(resolvePath())
  } catch {
    throw new CepError('IO', `${FILE_NAME} 读取失败，拒绝写入`)
  }

  if (text === null) {
    await base.write(createCommonUseSeed())
    return { created: true }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new CepError('IO', `${FILE_NAME} 内容不是合法 JSON，拒绝覆盖`)
  }
  const info = (parsed as CommonUseFile | null)?.info
  if (info !== undefined && !Array.isArray(info)) {
    throw new CepError('IO', `${FILE_NAME} 的 info 不是数组，拒绝覆盖`)
  }
  return { created: false }
}

/**
 * 在 `update` 的 mutator 里取可写数组：形状不对直接抛，不兜底。
 * 返回的就是 `file.info` 本体（不是拷贝），所以原地 `splice` 能落回文件里。
 */
function requireItems(file: CommonUseFile): NonNullable<CommonUseFile['info']> {
  if (!Array.isArray(file.info)) {
    throw new CepError('PARSE', `${FILE_NAME} 的 info 不是数组，无法改写`)
  }
  return file.info
}

/**
 * 排序：**复用** `domain/reorder.applyListDrop`（原版拖拽四分支的落点计算，`:37786-37796`），
 * 不在这里另写一份下标运算。`position` 是"插在目标前/后"。
 */
async function move(from: number, to: number, position: DropPosition): Promise<CommonUseFile> {
  return base.update((file) => {
    const items = requireItems(file)
    applyListDrop(items, from, to, position)
    return file
  })
}

/** 显隐：只改这一项的 `isShow`，不动顺序 */
async function setShow(id: string, show: boolean): Promise<CommonUseFile> {
  return base.update((file) => {
    const items = requireItems(file)
    const index = findCommonUseIndex(items, id)
    if (index < 0) throw new CepError('PARSE', `常用项不存在：${id}`)
    items[index].isShow = show
    return file
  })
}

/**
 * 恢复默认（官方 `resetConfig()`：全清 + 重新 push 种子 + 整份 `updata`，`:11101-11108`）。
 * **只换 `info`，文件顶层的未知键原样保留**——官方也写这个文件，整份替换等于删他的字段。
 */
async function resetAll(): Promise<CommonUseFile> {
  return base.update((file) => {
    file.info = createCommonUseSeed().info
    return file
  })
}

export const commonUseRepo = {
  read: (): Promise<RepoRead<CommonUseFile>> => base.read(),

  // 订阅**不自己实现**：`fileRepo` / `memoryRepo` 本来就有 `onChange` + 监听表
  // （`file-repo.ts:32,45-46,170-173`），这层再包一遍就是同一事件两套总线。
  write: (value: CommonUseFile): Promise<void> => base.write(value),
  update: (mutator: (value: CommonUseFile) => CommonUseFile | void): Promise<CommonUseFile> =>
    base.update(mutator),
  onChange: (listener: (value: CommonUseFile) => void): (() => void) => base.onChange(listener),

  ensure: ensureCommonUseFile,
  move,
  setShow,
  resetAll,
}

export type CommonUseRepo = typeof commonUseRepo
