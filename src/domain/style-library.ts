// 是什么：样式库的只读模型 —— 仓库索引（`sj_kuStoreInfo.ini`）与四类库文件的组/项归一化
// 替代了什么：把「颜色项看 color.hex、渐变项看 gradient.gradient.colors、字体项看 fonts[0]」散在页面里
// 谁在用：`cep/data/style-library-repo.ts`（读）、`pages/style`（展示）
// 禁止：不读文件、不写文件；未知键不猜（读进来原样保留，见 库文件格式契约 §2.2/§2.3）

import { resolveKuGroups } from './ku-format'

/** 四类库。顺序 = 页面 tab 顺序（原版 `switchval`，`app.v4.js:54590`） */
export type KuKind = 'color' | 'gradient' | 'font' | 'style'

export const KU_KINDS: readonly KuKind[] = ['color', 'gradient', 'font', 'style']

/** 原版 `data.switchval`（`app.v4.js:54590`）：颜色的 tab 文案就是「颜色」 */
export const KU_TAB_LABELS: readonly string[] = ['颜色', '渐变', '字体', '样式']

/**
 * 索引 `list[i]`。字段并集实测为 `name, show?, color, gradient, font, style`（契约 §2.2）。
 * `show` 实测存在但**可选**，且参考源码里查不到生产它的代码 →
 * 读到就原样保留回写，新建时不自己造（同 §2.2 结论）。
 * 索引签名是为了保留未知键：原面板可能写了我们不知道的字段。
 */
export interface StyleWarehouse {
  name: string
  show?: Partial<Record<KuKind, boolean>>
  color?: string
  gradient?: string
  font?: string
  style?: string
  [key: string]: unknown
}

export interface StyleWarehouseIndex {
  index: number
  list: StyleWarehouse[]
}

/** 原版初始值 `app.v4.js:53311-53315`：一个「默认仓库」+ 四个库文件名（由 `P_()` 生成，见第 2 段 T-48） */
export function defaultStyleIndex(): StyleWarehouseIndex {
  return { index: 0, list: [{ name: '默认仓库' }] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export interface KuIndexRead {
  value: StyleWarehouseIndex
  /** 非空 = 索引不是认识的形状，调用方要提示，不能当成"新用户" */
  degraded: string
}

/** 索引归一化：缺字段不补假值，`index` 越界夹到合法范围 */
export function readStyleWarehouseIndex(raw: unknown): KuIndexRead {
  if (!isRecord(raw) || !Array.isArray(raw.list)) {
    return { value: defaultStyleIndex(), degraded: '仓库索引结构不认识' }
  }

  const list = raw.list.filter(isRecord).map((item) => item as StyleWarehouse)
  if (!list.length) {
    return { value: { index: 0, list: [] }, degraded: '仓库索引里没有任何仓库' }
  }

  const index = typeof raw.index === 'number' && Number.isFinite(raw.index) ? raw.index : 0
  const safe = Math.min(Math.max(Math.trunc(index), 0), list.length - 1)
  return { value: { index: safe, list }, degraded: '' }
}

/** 列表里显示的一项；`swatch` 是可直接塞进 `background` 的 CSS 值（颜色 / 渐变），没有就不画色块 */
export interface KuItem {
  name: string
  swatch?: string
  /**
   * 图片型渐变的文件名（`gradient.fileName`）。
   *
   * 原版有 `fileName` 就用 `<img src="isMac + kuGradient + "/" + fileName">`，没有才用 CSS 渐变
   * （`app.v4.js:50558-50567`；`imgPath` = `path.kuGradient + "/"`，`:50617`；
   * `isMac` = `getOsPrefix()`，Mac 返回 `"file://"`，Windows 返回 `""`，`:72855-72862`）。
   * 渲染在页面做（要拼 OS 前缀），这里只把文件名透出来。
   */
  image?: string
  /** 字体项在 70×44 卡片里显示的四件套；只有 `fontItem` 产出 */
  fontPreview?: KuFontPreview
  /**
   * 样式项缩略图文件名（`<item.id>.png`）。
   *
   * 原版 `src = isMac + urlData + "/kuStyle/" + item.id + ".png"`（`app.v4.js:51352`；
   * `urlData` = 用户目录 `:51422`，`kuStyle` = `<userDir>/kuStyle` `:5223`）。
   * 同样在页面拼路径，这里只透出文件名。
   */
  thumb?: string
}

/**
 * 字体项卡片的四件套（原版 render `app.v4.js:50956-50971`）：
 * `fonts.length` + `parseInt(size)+"点"` + 5×5 色点 + 「中文字」预览（字体本身用 `fonts[0].family`）。
 *
 * 原版直接取 `fonts[0].color.rgb`，而契约 §2.3 的实测样本里 `color` 是 `null` ——
 * 照抄会让整块渲染抛错。这里拿不到 rgb 就给空串，页面不画色点，**不补默认颜色**。
 */
export interface KuFontPreview {
  /** `fonts.length` */
  count: number
  /** `parseInt(size) + "点"`；size 不是数字时为空串 */
  size: string
  /** `rgb(r,g,b)`；`color` 缺失 / 为 null / 通道不是数字时为空串 */
  color: string
  family: string
  weight: string
  scriptFamily: string
}

export interface KuGroup {
  name: string
  show: boolean
  items: KuItem[]
}

const HEX_RE = /^[0-9a-fA-F]{3,8}$/

function itemName(raw: Record<string, unknown>): string {
  // 原版 `createGroupObject` 的项都有 name；实测样本里未命名的项写的是 "未命名"，不是空串
  return typeof raw.name === 'string' && raw.name ? raw.name : '未命名'
}

/** 颜色项：`{ name, color: { hex, c, m, y, k } }`（实测样本见契约 §2.3） */
function colorItem(raw: Record<string, unknown>): KuItem {
  const color = raw.color
  if (isRecord(color) && typeof color.hex === 'string' && HEX_RE.test(color.hex)) {
    return { name: itemName(raw), swatch: `#${color.hex}` }
  }
  return { name: itemName(raw) }
}

/**
 * 渐变项 → CSS `linear-gradient`。
 *
 * 原版 `getGradientArr`（`app.v4.js:50709-50727`）：
 * ```js
 * a[e].push("#" + t.color.hexValue + " " + t.location / 4096 * 100 + "%");
 * a[e] = 90 + n[e] + "deg," + a[e].join(",");
 * ```
 * 三条照抄的规则：
 * 1. `location` 是 **0–4096 刻度**（实测 `sj_kuGra6A784C90B4183F79.ini`：0 / 1997 / 4070），
 *    必须 `/4096*100`。不换算会拼出 `#D8C09E 1997%`，浏览器只画最前面一小段 → 看着就是纯色块。
 * 2. 角度是 `90 + angle`，不是 `angle` 本身。
 * 3. **只取 `colors`**：`transparency`（同样 0–4096 刻度）原版没有拼进 CSS，我们也不自作聪明加。
 *
 * 百分比不四舍五入：`1997/4096*100 = 48.7548828125`，原版就是这个串。
 */
function gradientSwatch(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const inner = value.gradient
  if (!isRecord(inner) || !Array.isArray(inner.colors)) return undefined

  const stops: string[] = []
  for (const stop of inner.colors) {
    if (!isRecord(stop)) continue
    const color = stop.color
    if (!isRecord(color) || typeof color.hexValue !== 'string') continue
    if (!HEX_RE.test(color.hexValue)) continue

    // location 缺就省位置百分比；原版这里会拼出 "undefined%"，我们不补默认值
    const at = typeof stop.location === 'number' ? ` ${(stop.location / 4096) * 100}%` : ''
    stops.push(`#${color.hexValue}${at}`)
  }
  if (stops.length < 2) return undefined

  // 原版恒写方向（`90 + n[e] + "deg,"`）；angle 不是数字时无从换算，直接不给色块而不是猜 90
  if (typeof value.angle !== 'number') return undefined
  return `linear-gradient(${90 + value.angle}deg, ${stops.join(', ')})`
}

function gradientItem(raw: Record<string, unknown>): KuItem {
  const item: KuItem = { name: itemName(raw) }

  // 图片型渐变优先：有 fileName 就交给页面渲染 <img>，不在这里拼 CSS（原版 :50558-50562）
  const gradient = raw.gradient
  if (isRecord(gradient) && typeof gradient.fileName === 'string' && gradient.fileName) {
    item.image = gradient.fileName
  }

  const swatch = gradientSwatch(gradient)
  if (swatch) item.swatch = swatch
  return item
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** `color.rgb` → `rgb(r,g,b)`；缺通道就给空串（原版这里直接取 `.r`，样本里 `color` 为 null 会抛） */
function fontColor(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.rgb)) return ''
  const { r, g, b } = value.rgb
  if (![r, g, b].every((channel) => typeof channel === 'number' && Number.isFinite(channel))) {
    return ''
  }
  return `rgb(${r as number}, ${g as number}, ${b as number})`
}

/**
 * 字体项：`{ name, fonts: [{ family, size, weight, scriptFamily, color }] }`（契约 §2.3）。
 * 卡片显示「字体数 + N点 + 5×5 色点 + 中文字」（原版 render `app.v4.js:50956-50971`）。
 */
function fontItem(raw: Record<string, unknown>): KuItem {
  const item: KuItem = { name: itemName(raw) }
  const fonts = raw.fonts
  if (!Array.isArray(fonts) || !fonts.length || !isRecord(fonts[0])) return item

  const first = fonts[0]
  // 原版 `parseInt(e.fonts[0].size) + "点"`；size 在默认模板里是数字、样本里是字符串，两种都收
  const size = parseInt(String(first.size), 10)

  item.fontPreview = {
    count: fonts.length,
    size: Number.isFinite(size) ? `${size}点` : '',
    color: fontColor(first.color),
    family: text(first.family),
    weight: text(first.weight),
    scriptFamily: text(first.scriptFamily),
  }
  return item
}

/**
 * 样式项：客户端契约只保证 `{ name, id, layerId }`（`checkError` `app.v4.js:52997`），
 * 其余是 jsxbin `ys_AddStyle` 返回的"PS 效果载荷"，字段名未定（契约 §6.1 #1a）→ 不猜、不展示。
 * `id` 只用来拼缩略图文件名（原版 `:51352`）；没有 `id` 就不给 `thumb`，页面留深色底。
 */
function styleItem(raw: Record<string, unknown>): KuItem {
  const item: KuItem = { name: itemName(raw) }
  const id = raw.id
  if (typeof id === 'string' && id) item.thumb = `${id}.png`
  return item
}

const ITEM_READERS: Record<KuKind, (raw: Record<string, unknown>) => KuItem> = {
  color: colorItem,
  gradient: gradientItem,
  font: fontItem,
  style: styleItem,
}

export interface KuGroupsRead {
  groups: KuGroup[]
  /** 非空 = 内容被跳过或结构不认识，调用方要提示（不许当成空库） */
  note: string
}

/**
 * 把一个库文件文本读成组列表。
 *
 * `decode` 由调用方注入（`cep/fs.ts` 的 `b64ToUtf8`），这里保持纯函数、可单测。
 */
export function readKuGroups(
  kind: KuKind,
  text: string,
  decode: (base64: string) => string,
): KuGroupsRead {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { groups: [], note: '库文件不是合法 JSON' }
  }

  const source = resolveKuGroups(parsed, decode)
  if (!source.groups) return { groups: [], note: source.note || '库文件里没有可用的组数据' }

  const reader = ITEM_READERS[kind]
  const groups: KuGroup[] = []
  for (const raw of source.groups) {
    if (!isRecord(raw)) continue
    const list = Array.isArray(raw.list) ? raw.list : []
    groups.push({
      name: typeof raw.name === 'string' && raw.name ? raw.name : '未命名分组',
      // 原版组的 `show` 是"显示开关"，缺省视为显示
      show: typeof raw.show === 'boolean' ? raw.show : true,
      items: list.filter(isRecord).map(reader),
    })
  }
  return { groups, note: groups.length ? '' : source.note }
}
