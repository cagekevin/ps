// 是什么：常用页（`/commonUse`）的落盘结构、官方种子与「落盘 → 页面视图」的纯函数
// 替代了什么：原版 `V.a.info` 数组上的就地读写（app.v4.js:11088-11261 的存储类与 configReset）
// 谁在用：`cep/data/common-use.ts`（仓库）、后续 `stores/common-use.ts`（只读投影，T-87）
// 禁止：不读文件、不调 jsx、不 import Vue；不在这里判断"要不要写"（那是命令层的事）
import { isArrayOf, isRecord, isUnknownArray } from '@/utils/guards'
import { type Decoded } from '@/utils/decode'

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

/**
 * 整个文件 = **裸数组**（14 项，没有外层对象）。
 *
 * 一手依据：官方 `configReset()` 直接 `return [{ id: "div_img_cya1" … }, …]`（`app.v4.js:11112`），
 * 基类 `this.info = n` 拿的就是这个数组（`:6389`），`updata()` 是 `JSON.stringify(this.info)`（`:6401`），
 * 读回来用 `Object.assign(this.info, r)` 灌进数组（`:6392`）；真机文件 `%APPDATA%/SheJiZhuLi/sj_commonFunction.json`
 * 实测 3489 字节、根是数组、14 项（fixture：`tests/fixtures/sj_commonFunction.official.json`）。
 *
 * 之前的 `{ info: [...] }` 是错的（写出去官方面板读不到 14 项 → 常用页显示空态），
 * 现在读侧兼容旧形状、写侧一律归一成数组（见 `readCommonUseItems` 与 `cep/data/common-use.ts` 的 mutator）。
 */
export type CommonUseFile = CommonUseItem[]

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

/** 空文件：仓库的 fallback——**不是**种子，种子只在 `ensure()` 里显式写 */
export function createEmptyCommonUseFile(): CommonUseFile {
  return []
}

/** 官方默认那份（深拷贝，避免调用方改到常量） */
export function createCommonUseSeed(): CommonUseFile {
  return COMMON_USE_SEED.map((item) => ({ ...item }))
}

/**
 * 根形状 → 项数组（**唯一实现**；读边界与写路径共用）：裸数组 或 旧 `{ info: [...] }`，其它返回 `null`。
 * 声明边界：这是「一份实现」，不是「唯一入口」—— TS 挡不住别人再写一遍 `raw.info` 解包。
 *
 * 兼容旧形状：我们早期把文件写成 `{ info: [...] }`（错误），读侧认它、写侧归一成裸数组，
 * 这样已经跑过旧版本的用户不会丢那 14 项。
 *
 * 条目级只证"是对象"；有任何一条不是对象 → `null`（整份不认识，不 filter 掉后写回）。
 *
 * **怎么用**：读边界走 `decodeCommonUseFile(raw)`，写路径走 `requireItems(file)`（它在 `null` 时抛
 * `CepError('PARSE')`）。两处都**调这个函数**，不要各自解包。
 *
 * **别这么写**：`(raw as { info?: unknown }).info`、`Array.isArray(file) ? file : file.info`、
 * `file.info as CommonUseItem[]` —— 都是第二份解包判据，改判据时必漏一处。
 */
export function toCommonUseItems(raw: unknown): CommonUseItem[] | null {
  const candidate = isUnknownArray(raw) ? raw : isRecord(raw) ? raw.info : null
  // 「数组 + 逐条证明」用 `guards.isArrayOf`；条目证明用 `isCommonUseItem`（本文件唯一一份）
  return isArrayOf(candidate, isCommonUseItem) ? candidate : null
}

/** 取项数组；形状不对时给空数组（视图侧兜底，形状判定在 `toCommonUseItems`） */
export function readCommonUseItems(file: CommonUseFile | null | undefined): CommonUseItem[] {
  return toCommonUseItems(file) ?? []
}

/** 读边界：常用页文件（判据在 `toCommonUseItems`，认裸数组与旧 `{ info: [...] }`） */
export function decodeCommonUseFile(raw: unknown): Decoded<CommonUseFile> | null {
  const items = toCommonUseItems(raw)
  return items === null ? null : { value: items }
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

// ---------- 格子图标：官方三段三元分支的镜像 ----------

/** 官方 `:35695` 两个导出图标名（`cyExport.ext == "PNG"` 时用第二个） */
const EXPORT_ICON_JPG = '#icondaochutupian'
const EXPORT_ICON_PNG = '#icondaochutupian2'
/** 官方 `:35704` 两个填充色图标名（`cyAutoFillColor` 为真用第一个） */
const AUTO_FILL_ICON_ON = '#iconzidongtianchongsanse'
const AUTO_FILL_ICON_OFF = '#iconzidongtianchongyanse'

/** 格子图标的三个外部状态；键名对应官方 `set.*` 与组件本地态 */
export interface TileIconState {
  /** 鼠标停在本格图标块上（官方 `fillSvgName == a`，`:35674-35681`） */
  hovered: boolean
  /** 本格面板展开中（官方 `openfun == e.name`，`:38193`/`:38213`） */
  expanded: boolean
  /** `sj_set.json` 的 `cyExport.ext`（官方 `set.cyExport.ext`） */
  exportExt: unknown
  /** `sj_set.json` 的 `cyAutoFillColor`（官方默认 `true`，`:65784`） */
  autoFillColor: unknown
}

/**
 * 这一格该显示哪个图标。官方 render 里是**三段并列的三元**，顺序不能换：
 *
 * 1. 导出图片：`cyExport.ext == "PNG" ? "#icondaochutupian2" : "#icondaochutupian"`（`:35695`）
 * 2. 自动填充颜色：`cyAutoFillColor ? "#iconzidongtianchongsanse" : "#iconzidongtianchongyanse"`（`:35704`）
 * 3. 其余：`(fillSvgName != a && openfun != e.name) || !fillSvg ? e.svg : e.fillSvg`（`:35713`）
 *    → 只有"悬停本格 **或** 本格展开"且这一格有 `fillSvg` 时才用第二图标
 *
 * 前两段是**名字判定**，会盖掉第三段（导出图片的 `fillSvg` 本来就是 `false`，所以悬停不换图标）。
 *
 * 两个默认值按官方：`cyExport.ext` 缺键按 `JPG`（`:65796`），`cyAutoFillColor` 缺键按开（`:65784`）——
 * 我方投影不补默认值，所以这里只把显式 `false` 当关。
 *
 * `hovered` 走组件本地态（官方也是组件本地 `fillSvgName`），不是页面状态。
 */
export function resolveTileIcon(tile: CommonUseTile, state: TileIconState): string {
  if (tile.name === '导出图片') {
    return state.exportExt === 'PNG' ? EXPORT_ICON_PNG : EXPORT_ICON_JPG
  }
  if (tile.name === '自动填充颜色') {
    return state.autoFillColor === false ? AUTO_FILL_ICON_OFF : AUTO_FILL_ICON_ON
  }
  const useFilled = (state.hovered || state.expanded) && Boolean(tile.icon.filled)
  return useFilled && tile.icon.filled ? tile.icon.filled : tile.icon.rest
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
// ---------- 常用页设置项的写入补丁（纯函数，命令层用它落 sj_set.json） ----------

/**
 * 把点路径 + 值变成**嵌套**补丁：`('cyExport.ext', 'PNG')` → `{ cyExport: { ext: 'PNG' } }`。
 *
 * 为什么必须是嵌套对象而不是整块：`legacy-settings.ts` 的 `assignDeep` 递归到叶子，
 * 传 `{ cyExport: {...} }` 会与磁盘上已有的 `compress` 等子键合并；传扁平同名键就会整块替换。
 * 依据：原版写入侧是 `deepmerge`（`app.v4.js:37619-37624`）。
 */
export function buildOptionPatch(path: string, value: unknown): Record<string, unknown> {
  const segments = path.split('.').map((s) => s.trim())
  if (!segments.length || segments.some((s) => !s)) {
    throw new Error(`设置项路径非法：${path}`)
  }
  // 逐层包成 `{ segment: inner }`，最内层是调用方给的值：中间态是 unknown，
  // 只在最后断言一次（`as never` 会让这一处彻底逃过类型检查，什么都能塞进去）
  const patch = segments.reduceRight<unknown>((inner, segment) => ({ [segment]: inner }), value)
  return patch as Record<string, unknown>
}

/**
 * `CommonUseItem` 的形状证明：字段全可选 + 索引签名 ⇒ "是个普通对象"即满足契约。
 * 存在意义：文件里读回来的元素进 `CommonUseItem[]` 时用证明，不用 `as`（`as` 是没人校验的盖章）。
 */
export function isCommonUseItem(value: unknown): value is CommonUseItem {
  return isRecord(value)
}
