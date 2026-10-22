// 是什么：字体面板的静态常量（图标名 / 文案 / 预设档位）
// 唯一入口：模板里不允许再出现字面量数组，全部从这里取
// 替代了什么：原版根组件 data 里的 10 组数组 + 各子组件的档位表
// 谁在用：pages/fontSet/*.vue
// 依据：app.v4.js:42944-42961（根）、:42259-42261（档位）、:39742-39756（排版）

export const TOP_ICONS_ONE = ['#iconfanyi', '#iconchaifen', '#iconanniu'] as const
export const TOP_ICONS_TWO = [
  '#iconfuzhiwenziyangshi',
  '#iconniantiewenziyangshi',
  '#icongenggaiwenbenfangxiang',
] as const
export const TOP_TITLES_ONE = ['翻译', '拆分文本', '创建按钮'] as const
export const TOP_TITLES_TWO = ['复制文字属性', '粘贴文字属性', '调整文本方向'] as const
/** 顶部带角标的按钮下标：组一 0/2、组二 1（app.v4.js:38274、38309） */
export const TOP_BADGES_ONE = [0, 2] as const
export const TOP_BADGES_TWO = [1] as const

export const BOTTOM_ICONS_ONE = [
  '#iconzuoduiqi',
  '#iconchuizhiduiqi',
  '#iconyouduiqi',
  '#iconchuizhijuzhongfenbu',
] as const
export const BOTTOM_ICONS_TWO = ['#iconbeijingchuizhiduiqi', '#iconchuizhifenbu'] as const
export const BOTTOM_ICONS_THREE = [
  '#icondingbuduiqi',
  '#iconshuipingduiqi',
  '#icondibuduiqi',
  '#iconshuipingjuzhongfenbu',
] as const
export const BOTTOM_ICONS_FOUR = ['#iconbeijingshuipingduiqi-', '#iconshuipingfenbu'] as const

export const BOTTOM_TITLES_ONE = ['左对齐', '居中对齐', '右对齐', '水平居中分布'] as const
export const BOTTOM_TITLES_TWO = ['与背景水平对齐', '垂直分布元素'] as const
export const BOTTOM_TITLES_THREE = ['顶对齐', '居中对齐', '底对齐', '垂直平均分布'] as const
export const BOTTOM_TITLES_FOUR = ['与背景垂直对齐', '水平分布元素'] as const

/** 拆分/合并，按钮文案 + 悬停说明（app.v4.js:38895-38896） */
export const SPLIT_BUTTONS = ['分行', '分为单个', '合并', '合并为段落'] as const
export const SPLIT_TITLES = [
  '将多行文本拆分为多个单行文本',
  '将文本拆分为单个文本',
  '将多个文本合并',
  '将多个文本合并为段落',
] as const

/** 生成按钮的内边距预设（app.v4.js:39056） */
export const CREATE_BUTTON_PADDINGS = ['10,5', '28,12', '15=3:1'] as const
/** 预设按钮 1-8，文案就是序号（app.v4.js:39033） */
export const CREATE_BUTTON_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export const HIERARCHY_TITLES = [
  '第1层级字号',
  '第2层级字号',
  '第3层级字号',
  '第4层级字号',
  '第5层级字号',
  '第6层级字号',
] as const

/** AppPreferences.typeUnits → 中文（app.v4.js:34079 fontUnit） */
export const UNIT_LABELS: Record<string, string> = {
  'TypeUnits.PIXELS': '像素',
  'TypeUnits.POINTS': '点',
  'TypeUnits.MM': '毫米',
}

/** 对齐图标的提示：原版把三种修饰键写在同一句里（app.v4.js:40539） */
export const ALIGN_TITLES = ['左', '居中', '右'] as const
export const ALIGN_TIP = '对齐文本，ctrl+点击设置段落对齐，shift+点击设置点文本'
