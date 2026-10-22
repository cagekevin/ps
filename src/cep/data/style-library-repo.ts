// 是什么：样式库的磁盘读写 —— 仓库索引 `sj_kuStoreInfo.ini` + 当前仓库的四个库文件
// 替代了什么：原版 `N_`（索引，`app.v4.js:53303-53740`）+ `X_/I_/K_/E_`（四库）的 `readToArray` / `updata`
// 谁在用：`stores/style-library.ts`（读投影）、`commands/style.ts`（写）
// 禁止：页面/组件不许 import 这里（走 store / 命令）

import { DATA_FILES } from '@/cep/env'
import { b64ToUtf8, readTextSmart, userDir, writeTextFileAtomic } from '@/cep/fs'
import {
  defaultStyleIndex,
  readKuGroups,
  readStyleWarehouseIndex,
  KU_KINDS,
  type KuGroup,
  type KuKind,
  type StyleWarehouse,
  type StyleWarehouseIndex,
} from '@/domain/style-library'
import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'
import { pick } from './pick'
import type { Repo } from './types'

/**
 * 索引仓库。读走 `fileRepo`（失败带 `degraded`，不抛）。
 * 写留给第 3 段（新建仓库要按 `P_()` 生成 `sj_kuCol<16 位大写 hex>.ini` 这类文件名，契约 §2.2）。
 */
export const styleIndexRepo: Repo<StyleWarehouseIndex> = pick(
  () => `${userDir()}/${DATA_FILES.styleLibrary}`,
  () => defaultStyleIndex(),
)

export interface KuLibraryRead {
  groups: KuGroup[]
  /** 非空 = 这个库读不到（文件缺 / 结构不认识 / 载荷被跳过），页面必须提示 */
  note: string
}

/**
 * 读一个库文件。
 *
 * 磁盘上的库文件是「裸组数组」（契约 §2.3），但用户可能把 `.kus` 之类整份拷进这个位置，
 * 所以仍走 `domain/ku-format.ts` 的三形态分派；`data` 是布尔 `false` 的条目在那里被跳过。
 * 文件名来自索引（可能是 `.ini` 也可能是 `.json`，**扩展名不代表格式**，契约 §2.2）。
 */
export async function readKuLibrary(kind: KuKind, fileName: string): Promise<KuLibraryRead> {
  if (!fileName) return { groups: [], note: '' }

  const text = await readTextSmart(`${userDir()}/${fileName}`)
  // 文件不存在是首次使用的正常状态（索引里还没写文件名时同理），不算读失败
  if (text === null || text === '') return { groups: [], note: '' }

  return readKuGroups(kind, text, b64ToUtf8)
}

export interface StyleLibrarySnapshot {
  index: StyleWarehouseIndex
  libraries: Record<KuKind, KuGroup[]>
  /** 非空 = 读到的不是真数据（索引损坏 / 某个库文件读不到） */
  degraded: string
}

function fileNameOf(warehouse: StyleWarehouse | undefined, kind: KuKind): string {
  const value = warehouse?.[kind]
  return typeof value === 'string' ? value : ''
}

/**
 * 一次读出「索引 + 当前仓库的四个库」。
 *
 * 只读当前仓库：原版 `initData` 也是 `getCurrentColorPath()` 那四个（`app.v4.js:53392-53407`），
 * 切仓库要写索引，属于第 2 段。
 */
export async function readStyleLibrary(): Promise<StyleLibrarySnapshot> {
  const stored = await styleIndexRepo.read()
  const parsed = readStyleWarehouseIndex(stored.value)
  const current = parsed.value.list[parsed.value.index]

  const libraries = {} as Record<KuKind, KuGroup[]>
  const notes: string[] = []

  for (const kind of KU_KINDS) {
    const read = await readKuLibrary(kind, fileNameOf(current, kind))
    libraries[kind] = read.groups
    if (read.note) notes.push(read.note)
  }

  return {
    index: parsed.value,
    libraries,
    degraded: [stored.degraded ?? '', parsed.degraded, ...notes].filter(Boolean).join('；'),
  }
}

/** 当前仓库某个库的绝对路径；拿不到就抛（不许静默写到别处） */
async function currentLibPath(kind: KuKind): Promise<string> {
  const stored = await styleIndexRepo.read()
  const index = readStyleWarehouseIndex(stored.value).value
  const warehouse = index.list[index.index]
  const fileName = fileNameOf(warehouse, kind)
  if (!fileName) {
    throw new CepError('IO', `索引里没有当前仓库的${kind}库文件名`)
  }
  return `${userDir()}/${fileName}`
}

/**
 * 往当前仓库的某个库追加一项，写回整份库文件。
 *
 * 原版 `addItem(groupIndex, item)`（如 `X_.addItem`，`app.v4.js:52464-52475` 附近）：
 * push 后 `updata()` = `JSON.stringify(this.info)` 整份重写（`:9127-9130`），没有"增量保存"。
 * 这里保持同一语义，但**只 push 一个项**：删除 / 重命名 / 排序属于第 3 段。
 *
 * 读原始 JSON 而不是读归一化后的组：归一化会丢未知键（样式项的 PS 效果载荷，契约 §6.1 #1a）。
 */
export async function appendStyleLibraryItem(
  kind: KuKind,
  groupIndex: number,
  item: unknown,
): Promise<void> {
  const { path, groups } = await readRawGroups(kind)

  const group = groups[groupIndex] as { list?: unknown } | undefined
  if (!group || typeof group !== 'object' || !Array.isArray(group.list)) {
    throw new CepError('PARSE', `分组 ${groupIndex} 不存在`)
  }
  group.list.push(item)

  const ok = writeTextFileAtomic(path, JSON.stringify(groups))
  if (!ok) throw new CepError('IO', `${kind} 库文件写入失败`)
}

/**
 * 替换一个项（`cy_changeStyleColor` 的回写）。
 *
 * 原版 `changeItem(groupIndex, itemIndex, newItem)`（`:50159`）：alt 应用颜色后
 * PS 侧可能改写颜色（如把可编辑色转成不可编辑），原版用返回值覆盖本地那一项。
 * 返回值结构未实测，所以这里**只接受对象**：不是对象就抛，不猜字段、不合并。
 */
export async function replaceStyleLibraryItem(
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
  item: unknown,
): Promise<void> {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new CepError('PARSE', 'cy_changeStyleColor 返回值不是对象，未回写')
  }

  const { path, groups } = await readRawGroups(kind)
  const group = groups[groupIndex] as { list?: unknown } | undefined
  if (!group || typeof group !== 'object' || !Array.isArray(group.list)) {
    throw new CepError('PARSE', `分组 ${groupIndex} 不存在`)
  }
  group.list[itemIndex] = item

  const ok = writeTextFileAtomic(path, JSON.stringify(groups))
  if (!ok) throw new CepError('IO', `${kind} 库文件写入失败`)
}

/**
 * 取组的 `id`（样式库的组才有：`{name,show,id,list}`，契约 §2.3）。
 *
 * 原版 `getGroupId(groupIndex)`（`app.v4.js:53013-53016`）就是 `this.info[t].id`；
 * `ps_ysBtnUseStyle` 与 `ys_AddStyle` 的 `groupId` 都来自它（`:51510` / `:51531`）。
 * 拿不到就抛：组 id 缺失时把空串发给 jsxbin，等于让 PS 去猜，不许。
 */
export async function readStyleGroupId(kind: KuKind, groupIndex: number): Promise<string> {
  const { groups } = await readRawGroups(kind)
  const id = (groups[groupIndex] as { id?: unknown } | undefined)?.id
  if (typeof id !== 'string' || !id) throw new CepError('PARSE', `分组 ${groupIndex} 没有 id`)
  return id
}

/** 读库文件里的原始组数组；三条路径共用，读不到一律抛（不猜、不补默认） */
async function readRawGroups(kind: KuKind): Promise<{ path: string; groups: unknown[] }> {
  const path = await currentLibPath(kind)
  const text = await readTextSmart(path)
  if (text === null) throw new CepError('IO', `${kind} 库文件读不到：${path}`)

  let groups: unknown
  try {
    groups = JSON.parse(text)
  } catch (e) {
    log.error('style', `${kind} 库文件不是合法 JSON`, e)
    throw new CepError('PARSE', `${kind} 库文件不是合法 JSON`)
  }
  if (!Array.isArray(groups)) throw new CepError('PARSE', `${kind} 库文件顶层不是数组`)
  return { path, groups }
}

/**
 * 读一个**原始项**（不过归一化）。
 *
 * `ps_ysBtnUseStyle` 发的是整个项 + `groupId`（`app.v4.js:51509-51511`），
 * 视图模型 `KuItem` 只留了 name/swatch/meta，会把样式项的 PS 效果载荷丢掉（契约 §6.1 #1a）。
 * 所以这里从磁盘取原件，深拷贝后再交给调用方。
 */
export async function readStyleLibraryItem(
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const { groups } = await readRawGroups(kind)
  const group = groups[groupIndex] as { list?: unknown } | undefined
  const list = group?.list
  if (!Array.isArray(list)) throw new CepError('PARSE', `分组 ${groupIndex} 不存在`)
  const item = list[itemIndex]
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new CepError('PARSE', `第 ${itemIndex} 项不存在`)
  }
  return structuredClone(item as Record<string, unknown>)
}
