/**
 * /custom 页面私有类型。
 *
 * 原版的行结构见 `docs/页面/04-自定义.md:40`：
 * `{tip, text, height, arr, allcount, pattern}`。
 */

/** 一行文案。字段名与原版一致，便于将来对照真机 */
export interface CustomRow {
  /** 行提示，如「第1行」 */
  tip: string
  /** 用户填的文案（表达式语法：`1:2:1` / `3=1>2` / `3=1%50`） */
  text: string
  /** 显示高度 */
  height: string
  /** 该行选中的位置锚点下标（0 起，9 个） */
  position: number
  /** 该行的单位（px / cm / mm / in / pt / pc） */
  unit: string
}

/** 形状三选一（`docs/页面/04-自定义.md:30`） */
export const SHAPES = ['矩形', '圆形', '正方形'] as const
export type ShapeIndex = 0 | 1 | 2

/** 形状序号 → 原版文案「生成的形状为X」（`04-自定义.md` 文案表，动态拼接） */
export const SHAPE_TEXT = ['矩形', '圆形', '正方形'] as const

/** 每行文案的字符上限；超出提示「不要超过100哦」（`04-自定义.md:224-225`） */
export const ROW_TEXT_MAX = 100

/** 位置锚点：9 个。原版分两组显示，顺序不同，不要合并（`04-自定义.md:44`） */
export const POSITION_GROUPS: ReadonlyArray<ReadonlyArray<{ icon: string; position: number }>> = [
  [
    { icon: 'iconwenanweizhi1', position: 0 },
    { icon: 'iconwenanweizhi2', position: 1 },
    { icon: 'iconwenanweizhi3', position: 2 },
    { icon: 'iconwenanweizhi4', position: 3 },
    { icon: 'iconwenanweizhi5', position: 4 },
    { icon: 'iconwenanweizhi6', position: 5 },
  ],
  [
    { icon: 'iconwenanweizhi7', position: 6 },
    { icon: 'iconwenanweizhi8', position: 7 },
    { icon: 'iconwenanweizhi9', position: 8 },
    { icon: 'iconwenanweizhi4', position: 3 },
    { icon: 'iconwenanweizhi5', position: 4 },
    { icon: 'iconwenanweizhi6', position: 5 },
  ],
]

/** 原版首行的初始结构（`04-自定义.md:38-45`） */
export function createRow(index: number): CustomRow {
  return {
    tip: `第${index + 1}行`,
    text: '',
    height: '',
    position: 0,
    unit: 'px',
  }
}
