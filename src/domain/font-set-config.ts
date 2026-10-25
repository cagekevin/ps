// 是什么：字体面板的配置形状与默认值（纯类型/常量，无 IO）
// 唯一入口：页面、命令、数据仓库共用这一份；不要在页面里另写一份 interface
// 替代了什么：原版 `V.a.info` 里字体面板字段的隐式形状（app.v4.js:65835-65866）
// 谁在用：pages/fontSet/**、commands/fontSet.ts、cep/data/legacy-settings.ts
// 禁止：这里不发请求、不读文件；写路径只在 data 层
import { isRecord } from '@/utils/guards'
import { decodeIndexed, type Decoded } from '@/utils/decode'

export interface PasteFontConfig {
  scriptFamily: boolean
  color: boolean
  opacity: boolean
  size: boolean
  leading: boolean
  tracking: boolean
}

export interface CreateButtonConfig {
  /** 1 圆角 / 2 直角 */
  type: number
  isLine: boolean
  /** "10,20" / "28,12" / "15=3:1" / "自动生成3" */
  padding: string
}

export interface TranslateConfig {
  from: string
  to: string
  /** 原版字段名就是 delete；true = 翻译结果替换原文本 */
  delete: boolean
}

/** 字体面板真正用到的设置字段 */
export interface FontSetSettings {
  ztHierarych: number[]
  ztPasteFont: PasteFontConfig
  ztCreateButton: CreateButtonConfig
  ztTranslate: TranslateConfig
  ztDistributedIsFixed: boolean
  ztDistributionFilter: boolean
  ztDefaultSize: number[]
  ztDefaultLeading: number[]
  ztDefaultTracking: number[]
  ztShowQuick: boolean
  ztShowCustom: boolean
  /** 字体选择器预览档位：0 / 24 / 38 / 50 */
  ztPreview: number

  ztExpandMultiple: boolean
  ztOldVersion: boolean
  appUnit: string
}

/** 默认值逐字对齐 app.v4.js:65835-65866 与 :65933-65934 */
export const FONT_SET_DEFAULTS: FontSetSettings = {
  ztHierarych: [92, 48, 36, 24, 15, 12],
  ztPasteFont: {
    scriptFamily: true,
    color: true,
    opacity: true,
    size: true,
    leading: true,
    tracking: true,
  },
  ztCreateButton: { type: 2, isLine: false, padding: '10,20' },
  ztTranslate: { from: 'auto', to: 'auto', delete: true },
  ztDistributedIsFixed: false,
  ztDistributionFilter: true,
  ztDefaultSize: [6, 8, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72, 84, 96, 108, 120],
  ztDefaultLeading: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.5],
  ztDefaultTracking: [-100, -50, -25, 0, 25, 50, 75, 100, 200, 300, 500, 1000],
  ztShowQuick: true,
  ztShowCustom: true,
  ztPreview: 0,

  ztExpandMultiple: true,
  ztOldVersion: false,
  appUnit: 'px',
}

/** 原版 lv 的元素：字段名是 zz / hjm / mz（和 FontItem 不同名，不能混） */
export interface QuickFont {
  family: string
  name: string
  scriptName: string
  zz: string[]
  hjm: string[]
  mz: string[]
}

export interface QuickFontFile {
  index: number
  list: QuickFont[]
}

export interface HierarchyPreset {
  name: string
  /** 恰好 6 级 */
  data: number[]
}

export interface HierarchyFile {
  index: number
  list: HierarchyPreset[]
}

export interface TranslateCounter {
  num: number
  max: number
  /** 原版 `getTime()`：日 + 年 + 月拼接，如 21202610 */
  time: string
}

/** 条目级只证"是对象"：磁盘上的真实形状未经真机验证，过严会把正常文件判成坏文件 */
function isQuickFont(x: unknown): x is QuickFont {
  return isRecord(x)
}

/** 读边界：快捷字体文件（容器坏 / 有条目不是对象 → 整份 `null`） */
export function decodeQuickFontFile(raw: unknown): Decoded<QuickFontFile> | null {
  return decodeIndexed(raw, isQuickFont)
}

function isHierarchyPreset(x: unknown): x is HierarchyPreset {
  return isRecord(x) && typeof x.name === 'string' && Array.isArray(x.data)
}

/** 读边界：层级预设文件（条目要 `name` + `data[]`） */
export function decodeHierarchyFile(raw: unknown): Decoded<HierarchyFile> | null {
  return decodeIndexed(raw, isHierarchyPreset)
}

/**
 * 读边界：翻译计数。三个字段都是原版 `Jv.getTime()` 的产物，缺一个就无法判断"今天" ⇒ 整份 `null`。
 *
 * ⚠️ **UNVERIFIED**：真机文件形状未经实测（禁 e2e）。若真实文件缺字段，用户会看到
 * 「内容结构不认识」且写被 D-42 拒绝 —— 已记进 R1 轮次文件的未处置清单。
 */
export function decodeTranslateCounter(raw: unknown): Decoded<TranslateCounter> | null {
  if (!isRecord(raw)) return null
  const { num, max, time } = raw
  if (typeof num !== 'number' || typeof max !== 'number' || typeof time !== 'string') return null
  return { value: { num, max, time } }
}

/** 原版每日 380 次（app.v4.js:42900），不是 1000（1000 是文本长度上限） */
export const TRANSLATE_DAILY_LIMIT = 380
