// 是什么：常用页（`/commonUse`）的落盘结构、官方种子与「落盘 → 页面视图」的纯函数
// 替代了什么：原版 `V.a.info` 数组上的就地读写（app.v4.js:11088-11261 的存储类与 configReset）
// 谁在用：`cep/data/common-use.ts`（仓库）、后续 `stores/common-use.ts`（只读投影，T-87）
// 禁止：不读文件、不调 jsx、不 import Vue；不在这里判断"要不要写"（那是命令层的事）

/**
 * 一条常用项：官方 `configReset()` 的 10 个键（`app.v4.js:11113-11161` 起）。
 *
 * 全部 optional + 索引签名，是为了**未知键不被丢**：
 * 原版文件里我们还看到过 `sort` / `openistrue`（运行期写在同一个数组项上，`:37619-37624`，
 * 会被 App 根的 deep watch 整份写回 `:16887-16893`），这些键我们**不解释、不更新**，但必须原样保留。
 */
export interface CommonUseItem {
  id?: string
  isMore?: boolean
  /** 右上角标（`#iconjiaobiao`，`app.v4.js:35715-35721`）。官方与 `isMore` 不同步，保留不解释 */
  ismark?: boolean
  isShow?: boolean
  title?: string
  /** 主图标名，形如 `#iconqianrutupian`（Icon 组件自带去 `#`，见 `components/Icon.vue`） */
  svg?: string
  /** 悬停/展开时的第二图标名；官方有 `false` 与字符串两种取值（见 `COMMON_USE_SEED` 的 cya4/cya5/cya8/cya13） */
  fillSvg?: boolean | string
  moreId?: string
  name?: string
  /** 展开面板的组件名（`comembed` 等 7 个），只有 7 项有 */
  comName?: string
  [key: string]: unknown
}

/** 整个文件：官方就是 `{ info: [...] }`，外面没有别的约定（`app.v4.js:11096` 只传了 path 与默认值） */
export interface CommonUseFile {
  info?: CommonUseItem[]
  [key: string]: unknown
}

/** 页面视图的一条：只带页面要用的东西（不带 `created`，不暴露 `sort`） */
export interface CommonUseTile {
  /** 稳定标识：官方每项都有 `id`（`div_img_cya1` …）；缺失时退化为 `index` 便于渲染但不参与写回 */
  id: string
  /** 在**落盘数组**里的下标——`move` 用它定位，与 `domain/reorder` 的落点计算同一坐标 */
  index: number
  name: string
  title: string
  icon: { rest: string; filled: string | null }
  isMore: boolean
  ismark: boolean
  visible: boolean
  moreId: string
  comName: string | null
}

/**
 * 官方种子 14 项：逐项照抄 `configReset()`（`app.v4.js:11111` 起的 `zt.configReset`）。
 * 顺序即官方顺序；`comName` 只有 7 项有（7 个展开面板）；`fillSvg` 既有 `false` 也有字符串。
 */
export const COMMON_USE_SEED: readonly CommonUseItem[] = [
  {
    id: 'div_img_cya1',
    isMore: true,
    ismark: true,
    isShow: true,
    title: '智能匹配图片到背景框(id嵌入图片)',
    svg: '#iconqianrutupian',
    fillSvg: false,
    moreId: 'img_cya1_gd',
    name: '嵌入图片',
    comName: 'comembed',
  },
  {
    id: 'div_img_cya2',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '智能匹配多张图片到背景框(id嵌入图片)',
    svg: '#iconqianruduotupian',
    fillSvg: false,
    moreId: '',
    name: '嵌入多图片',
  },
  {
    id: 'div_img_cya3',
    isMore: true,
    ismark: true,
    isShow: true,
    title: '智能导入多张图片到背景框(id嵌入图片)',
    svg: '#icondaoruduotupian',
    fillSvg: false,
    moreId: 'img_cya3_gd',
    name: '导入多图片',
    comName: 'comimport',
  },
  {
    id: 'div_img_cya4',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '',
    svg: '#iconzidongtianchongyanse',
    fillSvg: '#iconzidongtianchongyanselan',
    moreId: '',
    name: '自动填充颜色',
  },
  {
    id: 'div_img_cya5',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '修正形状图层因小数点造成的模糊',
    svg: '#iconxiuzhengmohu',
    fillSvg: '#iconxiuzhengmohulan',
    moreId: '',
    name: '修正模糊',
  },
  {
    id: 'div_img_cya6',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '填充线框互换',
    svg: '#icontianchongxiankuanghuhuan',
    fillSvg: false,
    moreId: '',
    name: '填充线框互换',
  },
  {
    id: 'div_img_cya7',
    isMore: true,
    ismark: true,
    isShow: true,
    title: '删除文档原数据，解决保存卡顿问题',
    svg: '#iconyouhuawendang',
    fillSvg: false,
    moreId: '',
    name: '优化文档',
    comName: 'comoptimization',
  },
  {
    id: 'div_img_cya8',
    isMore: true,
    ismark: false,
    isShow: true,
    title: '根据参数复制元素',
    svg: '#iconzidingyibianhuan',
    fillSvg: '#iconzidingyibianhuanlan',
    moreId: 'img_cya8_gd',
    name: '自定义变换',
    comName: 'comcustomChange',
  },
  {
    id: 'div_img_cya9',
    isMore: true,
    ismark: true,
    isShow: true,
    title: '快速导出JPG/PNG,默认使用Web格式，在设置里可以设置不压缩导出',
    svg: '#icondaochutupian',
    fillSvg: false,
    moreId: 'img_cya9_gd',
    name: '导出图片',
    comName: 'comexport',
  },
  {
    id: 'div_img_cya11',
    isMore: true,
    ismark: false,
    isShow: true,
    title: '切图使用',
    svg: '#iconcankaoxiangongju',
    fillSvg: false,
    moreId: 'img_cya11_gd',
    name: '参考线工具',
    comName: 'comreference',
  },
  {
    id: 'div_img_cya13',
    isMore: true,
    ismark: false,
    isShow: true,
    title: '将一行文字分成多行文字图层/合并多个文字图层',
    svg: '#iconanjianjufenbu',
    fillSvg: '#iconanjianjufenbulan',
    moreId: 'img_cya13_gd',
    name: '按间距分布',
    comName: 'comspacing',
  },
  {
    id: 'div_img_cya14',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '将一个组的内容替换到另一个组',
    svg: '#iconyuansutihuan',
    fillSvg: false,
    moreId: '',
    name: '元素替换',
  },
  {
    id: 'div_img_cya15',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '将两个图层位置进行调换',
    svg: '#iconweizhiduihuan',
    fillSvg: false,
    moreId: '',
    name: '位置对换',
  },
  {
    id: 'div_img_cya12',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '将两个图层颜色进行调换',
    svg: '#icontucengyansehuhuan',
    fillSvg: false,
    moreId: 'img_cya12_gd',
    name: '图层颜色互换',
  },
]

/** 空文件（没有 info）：`pick()` 的 fallback——**不是**种子，种子只在 `ensure()` 里显式写 */
export function createEmptyCommonUseFile(): CommonUseFile {
  return { info: [] }
}

/** 官方默认那份（深拷贝，避免调用方改到常量） */
export function createCommonUseSeed(): CommonUseFile {
  return { info: COMMON_USE_SEED.map((item) => ({ ...item })) }
}

/** 取 `info`；形状不对时给空数组（形状校验在仓库层做，这里不抛） */
export function readCommonUseItems(file: CommonUseFile | null | undefined): CommonUseItem[] {
  return Array.isArray(file?.info) ? file.info : []
}

/**
 * 官方展开后插在网格里的临时项（`{created, comName}`，`app.v4.js:38209`）。
 * 它**从不落盘**，也绝不进视图类型（见 `toTiles` 的过滤）。
 */
export function isCreatedPlaceholder(item: CommonUseItem): boolean {
  return Object.prototype.hasOwnProperty.call(item, 'created')
}

/**
 * 落盘 → 页面视图（单向）。三条硬规矩：
 * 1. `created` 临时项被过滤掉；
 * 2. **不读 `sort`**——官方写它但从不从 `contextjson` 读（写 `:37619-37624`，读只在 `:38176-38177` 的 cliarr 上），
 *    视图的顺序就是**数组顺序**；
 * 3. `index` 取落盘数组下标（过滤前算），这样 `move` 与视图指向同一坐标。
 */
export function toTiles(file: CommonUseFile | null | undefined): CommonUseTile[] {
  return readCommonUseItems(file)
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !isCreatedPlaceholder(item))
    .map(({ item, index }) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `#${index}`,
      index,
      name: typeof item.name === 'string' ? item.name : '',
      title: typeof item.title === 'string' ? item.title : '',
      icon: {
        rest: typeof item.svg === 'string' ? item.svg : '',
        filled: typeof item.fillSvg === 'string' ? item.fillSvg : null,
      },
      isMore: item.isMore === true,
      ismark: item.ismark === true,
      visible: item.isShow !== false,
      moreId: typeof item.moreId === 'string' ? item.moreId : '',
      comName: typeof item.comName === 'string' ? item.comName : null,
    }))
}

/** 按 `id` 找落盘下标；找不到返回 -1（调用方决定抛不抛） */
export function findCommonUseIndex(items: readonly CommonUseItem[], id: string): number {
  return items.findIndex((item) => item.id === id)
}

// ---------- 常用页的固定表（页面与命令层共用，所以放 domain）----------

/**
 * 翻转 6 向。**唯一一份**：命令层用它校验 payload，页面用它渲染 6 颗按钮。
 *
 * 官方 `app.v4.js:37805-37810`（`cyLeftRight→"左右"` … `cyToTop→"上"`）；
 * 传给 jsx 的就是这里的文本（`cy_transformPosition`，`:38122`）。
 */
export const FLIP_DIRECTIONS = ['左右', '上下', '左', '右', '下', '上'] as const

export type FlipDirection = (typeof FLIP_DIRECTIONS)[number]

/** 放大预设（`docs/页面/05-常用.md:42`：`[105,110,150,200]`） */
export const ENLARGE_PRESETS = [105, 110, 150, 200] as const

/** 整体放大预设（`:42`：`[101,102,103,120,140,250,300,350,400,500]`） */
export const ENLARGE_ALL_PRESETS = [101, 102, 103, 120, 140, 250, 300, 350, 400, 500] as const

/** 缩小预设（`:42`：`[95,90,80,50]`） */
export const NARROW_PRESETS = [95, 90, 80, 50] as const

/** 整体缩小预设（`:42`：`[99,98,97,70,60,50,33,25,20,10]`） */
export const NARROW_ALL_PRESETS = [99, 98, 97, 70, 60, 50, 33, 25, 20, 10] as const
