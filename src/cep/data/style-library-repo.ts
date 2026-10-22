// 是什么：样式库的磁盘读取 —— 仓库索引 `sj_kuStoreInfo.ini` + 当前仓库的四个库文件
// 替代了什么：原版 `N_`（索引，`app.v4.js:53303-53740`）+ `X_/I_/K_/E_`（四库）四处 `readToArray`
// 谁在用：`stores/style-library.ts`（只读投影）；第 2 段的导入导出命令（T-48）
// 禁止：页面/组件不许 import 这里（走 store）；这里不做任何写入

import { DATA_FILES } from '@/cep/env'
import { b64ToUtf8, readTextSmart, userDir } from '@/cep/fs'
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
import { pick } from './pick'
import type { Repo } from './types'

/**
 * 索引仓库。读走 `fileRepo`（失败带 `degraded`，不抛）；写留到第 2 段，
 * 那时新建仓库要按 `P_()` 的规则生成 `sj_kuCol<16 位大写 hex>.ini` 这类文件名（契约 §2.2）。
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
