/**
 * 适配层的原始数据形状（磁盘 / PS 返回的**未归一化**形态）。
 *
 * 归一化后的领域类型不在这里：`FontItem` 已下沉到 `src/domain/font-item.ts`
 * （domain 是最底层，不允许反向 import `@/cep`）。
 */

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
