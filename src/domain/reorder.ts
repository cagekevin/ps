// 是什么：拖拽落点纯函数 —— 把原版四分支 splice（`app.v4.js:50053-50065` 项 / `:50095-50107` 组）收敛成"先删后插"的下标计算
// 替代了什么：`domain/rename.ts` 的 `reorderItem`/`reorderGroup` 与 `commands/action.ts`/`commands/freePanel.ts` 的内联 splice
//             （T-67 已合并，全项目只剩这一份落点计算）
// 谁在用：`cep/data/style-library-repo.ts`、`commands/action.ts`、`commands/rename.ts`、`commands/freePanel.ts`
// 禁止：不读文件、不认"库/页"、不兜底——下标越界一律抛，让调用方看见

import { CepError } from '@/utils/errors'
import { msg } from './messages'

/**
 * 落点位置：插在目标**前**还是**后**。
 * 原版是 `am()` 里那个布尔 `_`（`app.v4.js:37442` 置 `true`，`:37508-37513` 按指针在目标的
 * 左/右（或上/下）半区改写），`Callback(n)` 里的 `n` 就是它。
 */
export type DropPosition = 'before' | 'after'

/** 一个落点坐标：第几组的第几项（组排序时 `index` 不用） */
export interface DropSlot {
  group: number
  index: number
}

export interface DropMove {
  from: DropSlot
  to: DropSlot
  position: DropPosition
}

/** 落点是否等于原位（原版外层判 `t != moveEndIndex[0] || e != moveEndIndex[1]`，`app.v4.js:50053`） */
export function isSameSlot(from: DropSlot, to: DropSlot): boolean {
  return from.group === to.group && from.index === to.index
}

/**
 * 落点插入下标 —— **在源元素已被删掉的数组上使用**。
 *
 * 原版四个分支（项 `app.v4.js:50055-50065`，组 `:50097-50107`，两处同构）：
 *
 * | 情况 | `n=true`（插前） | `n=false`（插后） |
 * |---|---|---|
 * | 跨组，或同组向后（`from.index > to.index`） | `to.index` | `to.index + 1` |
 * | 同组向前（`from.index < to.index`） | `to.index - 1` | `to.index` |
 *
 * 同组向前要 `-1`：源元素先被删掉，目标整体前移了一位。
 * 组排序走同一张表（组只有"同一列"，永远算同组）。
 */
export function dropInsertIndex(move: DropMove): number {
  const { from, to, position } = move
  const after = position === 'after' ? 1 : 0
  const sameGroupForward = from.group === to.group && from.index < to.index
  return to.index - (sameGroupForward ? 1 : 0) + after
}

function requireIndex(value: number, length: number, what: string): void {
  if (!Number.isInteger(value) || value < 0 || value >= length) {
    throw new CepError('PARSE', msg.validate.fn.reorderIndexMissing(what, String(value)))
  }
}

/**
 * 在一维数组上执行一次落点（组排序）：原地改，返回落点后的下标；`-1` = 原位，没动。
 *
 * 越界抛错，不静默跳过——下标来自 DOM 数据集，取不到就是页面与数据对不上，兜底只会把错误藏起来。
 */
export function applyListDrop<T>(
  list: T[],
  from: number,
  to: number,
  position: DropPosition,
): number {
  requireIndex(from, list.length, '第')
  requireIndex(to, list.length, '第')
  if (from === to) return -1

  const [item] = list.splice(from, 1)
  const at = dropInsertIndex({
    from: { group: 0, index: from },
    to: { group: 0, index: to },
    position,
  })
  list.splice(at, 0, item)
  return at
}

/**
 * 在「组 → 项」两级结构上执行一次落点（项拖拽，可跨组）：原地改，返回目标组里的新下标；`-1` = 原位。
 *
 * `lists` 是各组的项数组本身（不是拷贝）——`splice` 直接改到调用方手里的数组上。
 */
export function applyItemDrop(lists: unknown[][], move: DropMove): number {
  const source = lists[move.from.group]
  const target = lists[move.to.group]
  if (!source)
    throw new CepError('PARSE', msg.validate.fn.reorderGroupMissing(String(move.from.group)))
  if (!target)
    throw new CepError('PARSE', msg.validate.fn.reorderGroupMissing(String(move.to.group)))

  requireIndex(move.from.index, source.length, '第')
  requireIndex(move.to.index, target.length, '第')
  if (isSameSlot(move.from, move.to)) return -1

  const [item] = source.splice(move.from.index, 1)
  const at = dropInsertIndex(move)
  target.splice(at, 0, item)
  return at
}
