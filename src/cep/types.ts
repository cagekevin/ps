/**
 * 字体数据有两种形态，别混：
 *
 * - jsx 返回 / 页面使用：family / weights / names / postScriptNames
 * - 磁盘缓存 SysFont2.json：name / zz / mz / hjm / show
 *
 * 两者是同一份数据的两套键名（等长数组，同索引对应一个字重），
 * 统一由 ps.ts 里的 normalizeFont 转成 FontItem。
 */

/** 页面和 store 用的统一结构 */
export interface FontItem {
  /** 家族名，如「思源黑体」 */
  family: string
  /** 字重，如 Regular、Bold */
  weights: string[]
  /** 字体名 */
  names: string[]
  /** PostScript 名，设置字体时要传 */
  postScriptNames: string[]
  /** 缺字提示，运行期由 ZitiQiZhi.txt 注入 */
  qz?: string
  /** 收藏等级，运行期由 sj_ztglStar.ini 注入 */
  star?: number
}

/** 字体标签，来自 sj_ztglTags.ini */
export interface FontTag {
  /** 显示名，如「中-黑」 */
  text: string
  /** 该标签下的字体家族名 */
  arr: string[]
  /** 是否被勾选（原面板用来记忆筛选状态） */
  xz: boolean
}

/** SysFont2.json 里的一条记录 */
export interface SysFontRecord {
  name: string
  zz: string[]
  mz: string[]
  hjm: string[]
  show?: boolean
}

/** SysFont2.json 的整体结构 */
export interface SysFontFile {
  length: number
  arr: SysFontRecord[]
}

/** 选中图层状态 */
export interface LayerState {
  hasSelection: boolean
  typeNumber: number
}

export type CepErrorCode =
  | 'NO_CEP'
  | 'NO_NODE'
  | 'TIMEOUT'
  | 'JSX'
  | 'PARSE'
  | 'INIT'
  /** 没有选中图层 / 选中的不是文字图层 */
  | 'NO_SELECTION'

export interface PsResult<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}
