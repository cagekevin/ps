// 是什么：自由面板数据仓库（读写 `<userDir>/sj_appFreePanel.json`）
// 唯一入口：自由面板文件的读写只经过这里；命令层与 store 都不自己拼路径
// 替代了什么：原版 `$freePanelBox` 直接读写同一个文件（app.v4.js:2162-2194）
// 谁在用：`commands/freePanel.ts`、`stores/free-panel.ts`
// 禁止：把只属于本面板的 UI 字段（showText）写回原版文件——原版没有这个键（D-35）

import { DATA_FILES } from '@/cep/env'
import { userDir } from '@/cep/paths'
import {
  createEmptyFreePanel,
  decodeFreePanelFile,
  type FreePanelBlock,
  type FreePanelFile,
} from '@/domain/free-panel'
import { deepClone } from '@/utils/clone'
import { dataRepo } from './data-repo'
import type { Repo, RepoRead, RepoView } from './types'

/**
 * showText 是我方新增的 UI 字段，原版没有这个键（D-35）。
 *
 * 一手证据：实测 `%APPDATA%\SheJiZhuLi\sj_appFreePanel.json` 与原版备份
 * `back/freePanel/20221005/20221005-18-0.json`，block 的键只有
 * id / zIndex / showIcon / showNumber / type / width / height / children / data。
 *
 * 处理：写盘前剥掉这个键，读回时按缺省 true 处理（normalizeBlock 就是这么归一的）。
 * 会话内仍保留（overlay），否则「显示文字」开关点了立刻弹回原状；
 * 面板重开后回到 true —— 与原版一致，原版根本没有这个状态。
 */

/** 深度优先遍历 block（含 children） */
function eachBlock(blocks: FreePanelBlock[], visit: (block: FreePanelBlock) => void): void {
  for (const block of blocks) {
    visit(block)
    if (Array.isArray(block.children)) eachBlock(block.children, visit)
  }
}

/** 会话内的 showText（按 block id）；不落盘 */
const sessionShowText = new Map<number, boolean>()

/** 删掉 block 上的 showText 键，不动会话态 */
function stripShowText(blocks: FreePanelBlock[]): void {
  eachBlock(blocks, (block) => {
    delete block.showText
  })
}

/**
 * 记下 block 上的 showText（进会话态），并把键删掉。
 * 用于「调用方刚改过的值」——这是权威值，直接覆盖会话态。
 */
function captureShowText(blocks: FreePanelBlock[]): void {
  eachBlock(blocks, (block) => {
    if (typeof block.showText === 'boolean') sessionShowText.set(block.id, block.showText)
    delete block.showText
  })
}

/**
 * 从磁盘读到的值只作种子：会话里已经有值时不覆盖
 * （磁盘上没有这个键，normalizeBlock 会补成 true；覆盖会把用户刚点的开关弹回去）。
 */
function seedShowText(blocks: FreePanelBlock[]): void {
  eachBlock(blocks, (block) => {
    if (typeof block.showText === 'boolean' && !sessionShowText.has(block.id)) {
      sessionShowText.set(block.id, block.showText)
    }
  })
}

/**
 * 把会话态写回 block（缺省 true，与 normalizeBlock 一致）；
 * 同时清掉已经没有对应 block 的旧条目（block 被删后 id 可能被复用）。
 */
function applySessionShowText(blocks: FreePanelBlock[]): void {
  const seen = new Set<number>()
  eachBlock(blocks, (block) => {
    seen.add(block.id)
    if (typeof block.showText !== 'boolean') {
      block.showText = sessionShowText.get(block.id) ?? true
    }
  })
  for (const id of [...sessionShowText.keys()]) {
    if (!seen.has(id)) sessionShowText.delete(id)
  }
}

/**
 * `normalize` 接在读边界：磁盘内容是 `unknown`，只有 `readFreePanelFile` 认得的那一种形状才变成
 * `FreePanelFile`；认不出 → `degraded`，页面提示，绝不当空面板用。所以下面每处都可以直接
 * `value.obj.list`，不再需要 `?.` / `?? []`。
 */
const base: Repo<FreePanelFile> = dataRepo(
  () => `${userDir()}/${DATA_FILES.appFreePanel}`,
  createEmptyFreePanel,
  decodeFreePanelFile,
)

const listeners = new Set<(value: FreePanelFile) => void>()

function emit(value: FreePanelFile): void {
  for (const listener of listeners) listener(value)
}

/**
 * 仓库外面套一层：磁盘上没有 showText，会话里有。
 *
 * 读：磁盘值作种子（不覆盖会话态），再把会话态写回返回值。
 * 写：入参的 showText 是权威值，收进会话态；剥掉键的副本落盘。
 * 改：mutator 看到的是带 showText 的值（命令层照常读写），落盘时剥键。
 */

/** 读后把会话态贴回返回值 */
function prepareRead(result: RepoRead<FreePanelFile>): RepoRead<FreePanelFile> {
  // 坏文件不给 fallback（判别联合里取不到 value）：没有块可挂会话态，原样返回，坏因在 reason 里
  if (!result.ok) return result
  const blocks = result.value.obj.list
  seedShowText(blocks)
  stripShowText(blocks)
  applySessionShowText(blocks)
  return result
}

/** 把命令层的 mutator 包成"看得到会话态、落盘剥键"的底层 mutator */
function wrapMutator(
  mutator: (value: FreePanelFile) => FreePanelFile | void,
): (file: FreePanelFile) => FreePanelFile {
  return (file) => {
    const blocks = file.obj.list
    // mutator 要看到 showText（命令层按 block.showText 写）：磁盘值只作种子，会话态优先
    seedShowText(blocks)
    stripShowText(blocks)
    applySessionShowText(blocks)

    const next = mutator(file) ?? file
    // mutator 改过的 showText 是权威值，更新会话态
    captureShowText(next.obj.list)

    // 落盘的是剥掉 showText 的副本
    const onDisk = deepClone(next)
    stripShowText(onDisk.obj.list)
    return onDisk
  }
}

/**
 * 落盘剥 `showText` → 调底层写 → 回填会话态 → 通知。
 * **两个写方法（`write` / `overwrite`）共用这一份** ——
 * `showText` 是会话态、不落盘（ADR-05），两条写路都要走同一条剥/回填序列。
 */
function persistStripped(value: FreePanelFile, writeToBase: (onDisk: FreePanelFile) => void): void {
  const onDisk = deepClone(value)
  captureShowText(onDisk.obj.list)
  writeToBase(onDisk)
  applySessionShowText(value.obj.list)
  emit(value)
}

const freePanelImpl: Repo<FreePanelFile> = {
  read: () => prepareRead(base.read()),

  /** 整份替换：剥/回填序列后再落盘，CAS 由调用方表态 */
  replace: (value, cas) => persistStripped(value, (onDisk) => base.replace(onDisk, cas)),

  update: (mutator: (value: FreePanelFile) => FreePanelFile | void): FreePanelFile => {
    const persisted = base.update(wrapMutator(mutator))
    applySessionShowText(persisted.obj.list)
    emit(persisted)
    return persisted
  },

  onChange(listener: (value: FreePanelFile) => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** 只读视图（store 唯一能拿到的形状）：没有 write / update —— 调用不到 */
export const freePanelRepo: RepoView<FreePanelFile> = freePanelImpl
/** 写侧句柄：只给 commands/registry 的 ctx.data 用 */
export const freePanelWriter: Repo<FreePanelFile> = freePanelImpl
