// 是什么：字体快选的纯规则（系统字体 → 快捷项、字重排序、上限判断）
// 唯一入口：快选数据的形状转换只在这里；命令层不自己拼 zz/hjm/mz
// 替代了什么：原版 `lv.findFontAllInfo` / `lv.sortWeight`（app.v4.js:40193-40246）
// 谁在用：commands/fontSet.ts 的 fontSet.quickFont
// 禁止：这里不读文件、不调 jsx（数据由调用方传入）

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
 * 按固定顺序重排三个等长数组；未知字重保持原相对顺序排在末尾。
 * 原版是原地 splice，这里返回新对象（调用方拿到的不再是磁盘对象）。
 */
export function sortQuickFont(font: QuickFont): QuickFont {
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
export function canAddQuickFont(list: QuickFont[], family: string): string | null {
  if (list.length >= QUICK_FONT_LIMIT) return '最多添加15个字体哦'
  if (list.some((item) => item.family === family)) return '已存在同名字体'
  return null
}

/** 原版 weightLen 的计算属性：超过 7 个截断 */
export function visibleWeights(font: QuickFont): string[] {
  return font.zz.slice(0, QUICK_FONT_WEIGHT_LIMIT)
}
