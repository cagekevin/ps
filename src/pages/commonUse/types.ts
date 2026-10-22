/**
 * 常用页（`/commonUse`）私有类型与常量。
 *
 * 依据：`docs/页面/05-常用.md` 的已定案值表（第 34–63 行）与
 * `docs/生成/页面规格/05-常用.md` 的 render 展开。
 */

/** 7 个子面板的 key（原版 7 个子组件：comembed / comimport / comoptimization /
 *  comcustomChange / comexport / comreference / comspacing） */
export type SubPanelKey =
  'embed' | 'import' | 'optimization' | 'customChange' | 'export' | 'reference' | 'spacing'

/**
 * 常用项（网格里的一项）。
 *
 * `expand` = 展开到子面板（原版 `fpFunction` 的 `isMore` 分支）；
 * 否则直接执行命令。
 */
export interface CommonTile {
  key: string
  text: string
  icon: string
  /** 展开到哪个子面板 */
  expand?: SubPanelKey
  /** 直接执行时用的命令 id */
  command?: string
  /**
   * 原版这三个在自定义面板里直接 `$tips.show("请添加展开后的功能")`
   * （`docs/页面/05-常用.md:71`）：它们**只能**通过"添加到自由面板"进入。
   */
  needsFreePanel?: boolean
}

/**
 * 网格项清单。
 *
 * 顺序即默认展示顺序；用户拖拽后按 `usePersistedRef('commonUse.tileOrder')` 覆盖。
 */
export const COMMON_TILES: readonly CommonTile[] = [
  { key: 'embed', text: '嵌入图片', icon: 'iconqianrutupian', expand: 'embed' },
  { key: 'import', text: '导入多图片', icon: 'icondaoruduotupian', expand: 'import' },
  { key: 'optimize', text: '优化文档', icon: 'iconwancheng1', expand: 'optimization' },
  { key: 'export', text: '导出图片', icon: 'icondaochutupian', expand: 'export' },
  {
    key: 'customChange',
    text: '自定义变换',
    icon: 'iconzhuanhuan',
    expand: 'customChange',
    needsFreePanel: true,
  },
  {
    key: 'reference',
    text: '参考线工具',
    icon: 'iconcankaoxiangongju',
    expand: 'reference',
    needsFreePanel: true,
  },
  {
    key: 'spacing',
    text: '按间距分布',
    icon: 'iconanjianjufenbu',
    expand: 'spacing',
    needsFreePanel: true,
  },
]

/**
 * 翻转 6 向：`direction` 是命令层的合法值（`docs/页面/05-常用.md:42` 的常量表：
 * 左右/上下/左/右/下/上），`label` 是原版按钮提示文案（`:85` 文案表：
 * 左右翻转/上下翻转/向左翻转/向右翻转/向下翻转/向上翻转），`icon` 是 sprite 图标名。
 */
export const FLIP_ITEMS: readonly {
  direction: '左右' | '上下' | '左' | '右' | '下' | '上'
  label: string
  icon: string
}[] = [
  { direction: '左右', label: '左右翻转', icon: 'iconzuoyoufanzhuan' },
  { direction: '上下', label: '上下翻转', icon: 'iconshangxiafanzhuan' },
  { direction: '左', label: '向左翻转', icon: 'iconxiangzuofanzhuan' },
  { direction: '右', label: '向右翻转', icon: 'iconxiangyoufanzhuan' },
  { direction: '下', label: '向下翻转', icon: 'iconxiangxiafanzhuan' },
  { direction: '上', label: '向上翻转', icon: 'iconxiangshangfanzhuan' },
]

/** 放大预设（`docs/页面/05-常用.md:42`） */
export const ENLARGE_PRESETS = [105, 110, 150, 200] as const
/** 整体放大预设（`:42`） */
export const ENLARGE_ALL_PRESETS = [101, 102, 103, 120, 140, 250, 300, 350, 400, 500] as const
/** 缩小预设（`:42`） */
export const NARROW_PRESETS = [95, 90, 80, 50] as const
/** 整体缩小预设（`:42`） */
export const NARROW_ALL_PRESETS = [99, 98, 97, 70, 60, 50, 33, 25, 20, 10] as const

/** 变换的 9 个锚点（`docs/页面/05-常用.md:60`：图标 `iconmaodianbianhuandianweizhi1..9`） */
export const ANCHOR_ICONS = [
  'iconmaodianbianhuandianweizhi1',
  'iconmaodianbianhuandianweizhi2',
  'iconmaodianbianhuandianweizhi3',
  'iconmaodianbianhuandianweizhi4',
  'iconmaodianbianhuandianweizhi5',
  'iconmaodianbianhuandianweizhi6',
  'iconmaodianbianhuandianweizhi7',
  'iconmaodianbianhuandianweizhi8',
  'iconmaodianbianhuandianweizhi9',
] as const

/** 导出格式段选（`docs/页面/05-常用.md:61`：`switchval=["JPG","PNG"]`） */
export const EXPORT_FORMATS = ['JPG', 'PNG'] as const
/** PNG 位深（`:61`：`switchInputContext=["PNG-24","PNG-8"]`） */
export const PNG_DEPTHS = ['PNG-24', 'PNG-8'] as const
