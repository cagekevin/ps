// 是什么：自定义页（/custom）的数据形状（行结构 + 一次生成请求）
// 唯一入口：页面、命令层、jsx 端口共用这一份类型
// 替代了什么：原先只写在 `cep/jsx/types.ts` 里的 CustomLine/CustomRequest（页面不许 import cep/*）
// 谁在用：src/pages/custom/*、src/commands/custom.ts、src/cep/jsx/types.ts
// 禁止：页面与命令层各写一份同名字段

/**
 * 原版一行文案的结构（`docs/页面/04-自定义.md:40`）：
 * `{tip, text, height, arr, allcount, pattern}`。
 *
 * 字段名与原版一致，便于将来对照真机。
 */
export interface CustomLine {
  /** 行提示，如「第1行」 */
  tip: string
  /** 该行填写的文案（表达式语法：`1:2:1` / `3=1>2` / `3=1%50`） */
  text: string
  /** 显示高度（`heightIstrue` 为真时才用） */
  height: string
  /** 该行分配到的锚点位置下标（0 起） */
  arr: number[]
  /** 该行总块数 */
  allcount: string
  /** 表达式模式标记；用途未提取（`04-自定义.md:60`） */
  pattern: number
}

/**
 * 一次生成请求：把页面上的全部状态打成一个对象发给 PS 侧。
 *
 * UNVERIFIED: 原版 jsx 的**参数形状未实测**（`docs/页面/04-自定义.md:60-62`）。
 * C-7 定案：按调用侧推断并全部标 UNVERIFIED，返回按最宽松联合兜。
 */
export interface CustomRequest {
  /** 形状序号：0 矩形 / 1 圆形 / 2 正方形（`04-自定义.md:30`） */
  shapeIndex: number
  /** 文字位置序号（原版 `textLocation = parseInt(textLocation) + 1`，`:138`） */
  textLocation: number
  /** 是否显示高度 */
  heightIstrue: boolean
  /** 行间距 / 列间距（空则按 `8px` 兜底，`:132-136`） */
  rowSpacing: string
  columnSpacing: string
  /** 两级文字大小（空则按 `0` 兜底，`:126-131`） */
  textSize1: string
  textSize2: string
  /** 单位：px / cm / mm / in / pt / pc */
  unit: string
  /** 逐行文案 */
  lines: CustomLine[]
}
