// 是什么：字体快选的纯规则（系统字体 → 快捷项、字重排序、上限判断）
// 唯一入口：快选数据的形状转换只在这里；命令层不自己拼 zz/hjm/mz
// 替代了什么：原版 `lv.findFontAllInfo` / `lv.sortWeight`（app.v4.js:40193-40246）
// 谁在用：commands/fontSet.ts 的 fontSet.quickFont
// 禁止：这里不读文件、不调 jsx（数据由调用方传入）
// 关于 throw：本文件的 `CepError` 是**业务校验**（上限 / 重名），不是解析失败。

import { CepError } from '@/utils/errors'
import { msg } from './messages'
import type { QuickFont } from '@/domain/font-set-config'
import type { FontItem } from './font-item'

/** 原版 sortWeight 的权重顺序，app.v4.js:40220 */
const WEIGHT_ORDER = [
  'ExtraLight',
  'Light',
  'Book',
  'Normal',
  'Regular',
  'Medium',
  'Demi',
  'Bold',
  'Heavy',
]

/** 最多 15 个，原版 app.v4.js:40107 */
export const QUICK_FONT_LIMIT = 15

/** 最多显示 7 个字重，原版 app.v4.js:32316 的 weightLen */
export const QUICK_FONT_WEIGHT_LIMIT = 7

function weightRank(weight: string): number {
  const index = WEIGHT_ORDER.indexOf(weight)
  return index < 0 ? WEIGHT_ORDER.length : index
}

/**
 * 三个平行数组必须等长。
 *
 * `zz[i]` / `mz[i]` / `hjm[i]` 描述**同一个字重**。不等长说明数据源本身坏了
 * （`asArray` 在缺字段时给空数组），我们不知道谁对应谁——**按短的截断是替生产者编造"对齐方式"**
 * （AGENTS §20 规矩二），而且被丢掉的字重是不可逆的。
 * 所以这里**拒绝**：这个字体加不进快选，用户看到家族名与三个长度；`update` 的 mutator 抛错 ⇒
 * 文件一个字节都不会被写（仓库存盘在 mutator 之后）。
 */
function requireAligned(font: QuickFont): void {
  const { zz, mz, hjm } = font
  if (zz.length === mz.length && zz.length === hjm.length) return
  throw new CepError(
    'PARSE',
    msg.validate.fn.quickFontMisaligned(
      font.family,
      String(zz.length),
      String(mz.length),
      String(hjm.length),
    ),
  )
}

/**
 * 按固定顺序重排三个等长数组；未知字重保持原相对顺序排在末尾。
 * 原版是原地 splice，这里返回新对象（调用方拿到的不再是磁盘对象）。
 */
export function sortQuickFont(font: QuickFont): QuickFont {
  requireAligned(font)
  const order = font.zz
    .map((_, index) => index)
    .sort((a, b) => {
      const diff = weightRank(font.zz[a]) - weightRank(font.zz[b])
      return diff !== 0 ? diff : a - b
    })

  return {
    ...font,
    zz: order.map((index) => font.zz[index]),
    hjm: order.map((index) => font.hjm[index]),
    mz: order.map((index) => font.mz[index]),
  }
}

/**
 * 系统字体 → 快捷项（原版 findFontAllInfo 的映射方向）。
 * `name` / `scriptName` 必须取排序后的第一个字重，否则下拉显示的默认字体
 * 和实际会应用的字重对不上（原版这里取自当前图层的字体信息）。
 */
export function toQuickFont(font: FontItem): QuickFont {
  const sorted = sortQuickFont({
    family: font.family,
    name: font.family,
    scriptName: '',
    zz: [...font.weights],
    hjm: [...font.postScriptNames],
    mz: [...font.names],
  })

  return {
    ...sorted,
    name: sorted.mz[0] ?? font.family,
    scriptName: sorted.hjm[0] ?? '',
  }
}

/** 原版 addFont 的三条前置：上限 15、同家族去重、找不到系统信息 */
/** 能否再加一个：`ok` = 能加；`why` 是**原因码**（`limit` 满了 / `duplicate` 同名） */
export type QuickFontGate = { status: 'ok' } | { status: 'error'; fail: 'limit' | 'duplicate' }

/**
 * 能不能再往快速字体里加一个。
 *
 * 返回**原因码**而不是一句话：文案归 `domain/messages`（生产者不写用户文案）。
 * 也不用 `string | null` —— `null` 表示"成功"是反的，读代码的人得先想一遍才敢用。
 */
export function canAddQuickFont(list: QuickFont[], family: string): QuickFontGate {
  if (list.length >= QUICK_FONT_LIMIT) return { status: 'error', fail: 'limit' }
  if (list.some((item) => item.family === family)) return { status: 'error', fail: 'duplicate' }
  return { status: 'ok' }
}

/** 原版 weightLen 的计算属性：超过 7 个截断 */
export function visibleWeights(font: QuickFont): string[] {
  return font.zz.slice(0, QUICK_FONT_WEIGHT_LIMIT)
}
