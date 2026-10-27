// 是什么：动作库数据层——仓库索引 / 库文件读写，以及 PS 动作面板的原始读取
// 替代了什么：`src/cep/ps.ts` 的 `getRawActionList`（ps.ts 不再被 stores 需要）
// 谁在用：`stores/action.ts`（只读投影）、`commands/action.ts`（写仓库）
// 禁止：页面 import 本文件（走 store 投影）；解析归 `domain/action`，这里只"取回来"

import { DATA_FILES } from '@/cep/env'
import { hasNode } from '@/cep/node'
import { userDir } from '@/cep/paths'
import { removeFile } from '@/cep/disk-write'
import { initJsx } from '@/cep/ps'
import { jsx } from '@/cep/jsx'
import {
  decodeActionLibrary,
  decodeActionWarehouseIndex,
  type ActionLibrary,
  type ActionWarehouseIndex,
} from '@/domain/action'
import { dataRepo } from './data-repo'
import type { Repo, RepoView } from './types'
import { deepClone } from '@/utils/clone'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { runExclusive } from './exclusive'

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

const actionIndexImpl: Repo<ActionWarehouseIndex> = dataRepo(
  () => `${userDir()}/${DATA_FILES.actionLibrary}`,
  defaultActionIndex,
  decodeActionWarehouseIndex,
)

const actionLibraryImpl: Repo<ActionLibrary> = dataRepo(
  () => `${userDir()}/${currentFile}`,
  () => [],
  decodeActionLibrary,
  { seed: () => clone(SEED) },
)

/** 只读视图（store 唯一能拿到的形状）：没有 write / update —— 调用不到 */
export const actionIndexRepo: RepoView<ActionWarehouseIndex> = actionIndexImpl
export const actionLibraryRepo: RepoView<ActionLibrary> = actionLibraryImpl

/** 写侧句柄：只给 commands/registry 的 ctx.data / action-archive / cloud 同步用 */
export const actionIndexWriter: Repo<ActionWarehouseIndex> = actionIndexImpl
export const actionLibraryWriter: Repo<ActionLibrary> = actionLibraryImpl

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
export function addWarehouse(name = '未命名分组'): number {
  let index = -1
  actionIndexImpl.update((value) => {
    value.list.push({ name, fileName: newWarehouseFile() })
    index = value.list.length - 1
  })
  return index
}

/** 重命名仓库：只改 name，不动 fileName（原版 wh.rename 6576-6579） */
export function renameWarehouse(index: number, name: string): void {
  actionIndexImpl.update((value) => {
    const target = value.list[index]
    if (!target) throw new Error(msg.data.fn.actionWarehouseMissing())
    target.name = name
  })
}

/** 删除仓库：删文件 → 改索引；删当前项时 index=0（原版 wh.delete 6580-6596） */
export function deleteWarehouse(index: number): void {
  // 长事务互斥（`action-files` 域）：与「导入」写同一批 `sj_dz*`，两者不许同时进行
  return runExclusive('action-files', '动作库删除', () => {
    const read = actionIndexRepo.read()
    // 坏索引没有 value（判别联合）：不先判这一行，下面两句会分别说成「至少保留一个仓库」
    // 和「仓库不存在」——把"文件坏了"说成"你没有仓库"（T-101-1 / T-101-2）
    if (read.status === 'error') {
      throw new CepError('IO', msg.data.fn.actionIndexCorruptDeleteAbort(read.reason))
    }
    const indexValue = read.value
    if (indexValue.list.length <= 1) throw new Error(msg.data.fn.actionWarehouseLastOne())
    const target = indexValue.list[index]
    if (!target) throw new Error(msg.data.fn.actionWarehouseMissing())

    if (hasNode()) {
      // 删不掉会抛（错误里带完整路径与原因）；否则用户以为仓库已删，磁盘却还在
      // 而用户以为仓库已删。**先删文件、成功后才改索引** —— 反过来的话
      // 删失败就留下"索引说没有、磁盘还有"的孤儿。
      removeFile(`${userDir()}/${target.fileName}`)
    }

    actionIndexImpl.update((value) => {
      value.list.splice(index, 1)
      if (index < value.index) value.index -= 1
      else if (index === value.index) value.index = 0
      selectActionFile(currentWarehouseFile(value))
    })
  })
}

/** 切换仓库：改索引并切当前文件（原版 wh.select 6605-6612） */
export function selectWarehouse(index: number): void {
  actionIndexImpl.update((value) => {
    if (!value.list[index]) throw new Error(msg.data.fn.actionWarehouseMissing())
    value.index = index
    selectActionFile(currentWarehouseFile(value))
  })
}

// ── PS 动作面板的原始读取 ─────────────────────────────────────────────

/**
 * 读 PS 当前动作面板的**原始**返回。
 *
 * 只做"取回来"，不解析：结构未真机验证，解析放 `domain/action` 的 `readActionList`，
 * 模型化放 `stores/action` 的 `loadPsActions`。这样 store 不需要 import `cep/ps`。
 */
export async function getRawActionList(): Promise<unknown> {
  await initJsx()
  const outcome = await jsx.action.getActionList()
  if (outcome.status !== 'ok') {
    throw new CepError(outcome.fail, outcome.reason || outcome.fail)
  }
  return outcome.data
}
