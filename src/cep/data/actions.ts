import { DATA_FILES } from '@/cep/env'
import { hasNode, removeFile, userDir } from '@/cep/fs'
import type { ActionLibrary, ActionWarehouseIndex } from '@/domain/action'
import { pick } from './pick'
import type { Repo } from './types'
import { deepClone } from '@/utils/clone'
import { CepError } from '@/utils/errors'

/**
 * 动作库仓库。结构与原版源码一致（`app.v4.js:6552-6659`），不是猜的：
 *
 * - 索引 `sj_dzStoreInfo.json`：`{ index, list: [{ name, fileName }] }`
 * - 仓库文件 `<userDir>/sj_dz<随机>.json`：`[{ groupName, show, list: [{ group, name, alias? }] }]`
 * - 执行：`dz_callAction(item)` 传整个 item，不是 id
 * - 导出 `.dzx`：`{ arrFileData: [{ name, data: base64 }], store }`（P7 再做）
 */
export type {
  ActionGroup,
  ActionItem,
  ActionLibrary,
  ActionWarehouse,
  ActionWarehouseIndex,
} from '@/domain/action'

const DEFAULT_FILE = 'sj_dz_default.json'

let currentFile = DEFAULT_FILE

/** 切换当前仓库文件；`Repo` 的 resolvePath 惰性求值，切换后下一次读写即生效 */
export function selectActionFile(fileName: string) {
  currentFile = fileName || DEFAULT_FILE
}

const clone = deepClone

const DEFAULT_INDEX: ActionWarehouseIndex = {
  index: 0,
  list: [{ name: '默认仓库', fileName: DEFAULT_FILE }],
}

/** 只在浏览器 dev 用的种子 */
const SEED: ActionLibrary = [
  {
    groupName: '修图',
    show: true,
    list: [
      { group: '修图', name: '一键磨皮' },
      { group: '修图', name: '锐化' },
    ],
  },
  {
    groupName: '新建文档',
    show: true,
    list: [
      { group: '新建文档', name: '800x800' },
      { group: '新建文档', name: '1920x1080' },
    ],
  },
]

/**
 * 生产者自己的默认索引：坏读时消费方（store）用它，不许自己写一份（ADR-24）。
 * `actionIndexRepo` 的 fallback 也取这里，两条路径同源。
 */
export function defaultActionIndex(): ActionWarehouseIndex {
  return clone(DEFAULT_INDEX)
}

export const actionIndexRepo: Repo<ActionWarehouseIndex> = pick(
  () => `${userDir()}/${DATA_FILES.actionLibrary}`,
  defaultActionIndex,
  defaultActionIndex,
)

export const actionLibraryRepo: Repo<ActionLibrary> = pick(
  () => `${userDir()}/${currentFile}`,
  () => [],
  () => clone(SEED),
)

/** 从索引取当前仓库文件名；索引异常时回退默认（ADR-14：读可降级） */
export function currentWarehouseFile(index: ActionWarehouseIndex): string {
  const entry = index.list[index.index] ?? index.list[0]
  return entry?.fileName || DEFAULT_FILE
}

function newWarehouseFile(): string {
  // 原版 `"sj_dz" + h() + ".json"`；时间戳 + 随机串避免同毫秒撞名
  return `sj_dz${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.json`
}

/** 新建仓库：只加索引，仓库文件等首次写入时创建（原版 wh.add 6598-6603） */
export async function addWarehouse(name = '未命名分组'): Promise<number> {
  let index = -1
  await actionIndexRepo.update((value) => {
    value.list.push({ name, fileName: newWarehouseFile() })
    index = value.list.length - 1
  })
  return index
}

/** 重命名仓库：只改 name，不动 fileName（原版 wh.rename 6576-6579） */
export async function renameWarehouse(index: number, name: string): Promise<void> {
  await actionIndexRepo.update((value) => {
    const target = value.list[index]
    if (!target) throw new Error('仓库不存在')
    target.name = name
  })
}

/** 删除仓库：删文件 → 改索引；删当前项时 index=0（原版 wh.delete 6580-6596） */
export async function deleteWarehouse(index: number): Promise<void> {
  const read = await actionIndexRepo.read()
  // 坏索引没有 value（判别联合）：不先判这一行，下面两句会分别说成「至少保留一个仓库」
  // 和「仓库不存在」——把"文件坏了"说成"你没有仓库"（T-101-1 / T-101-2）
  if (!read.ok) {
    throw new CepError('IO', `动作库索引文件损坏（${read.reason}），删除已中止`)
  }
  if (read.value.list.length <= 1) throw new Error('至少保留一个仓库')
  const target = read.value.list[index]
  if (!target) throw new Error('仓库不存在')

  if (hasNode()) removeFile(`${userDir()}/${target.fileName}`)

  await actionIndexRepo.update((value) => {
    value.list.splice(index, 1)
    if (index < value.index) value.index -= 1
    else if (index === value.index) value.index = 0
    selectActionFile(currentWarehouseFile(value))
  })
}

/** 切换仓库：改索引并切当前文件（原版 wh.select 6605-6612） */
export async function selectWarehouse(index: number): Promise<void> {
  await actionIndexRepo.update((value) => {
    if (!value.list[index]) throw new Error('仓库不存在')
    value.index = index
    selectActionFile(currentWarehouseFile(value))
  })
}
