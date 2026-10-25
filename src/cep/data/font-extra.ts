// 是什么：字体面板的 3 份附属数据（快捷字体 / 层级预设 / 翻译计数）
// 唯一入口：这 3 个文件的读写只能经过这里；命令层不拼路径、不自己 read-modify-write
// 替代了什么：原版 `lv`（app.v4.js:40081）、`Ft`（:10798）、翻译计数器（:42836）
// 谁在用：commands/fontSet.ts、stores/font-set.ts
// 禁止：页面直接 import；写失败由仓库抛出，命令层不要吞

import { DATA_FILES } from '@/cep/env'
import { userDir } from '@/cep/paths'
import {
  TRANSLATE_DAILY_LIMIT,
  type HierarchyFile,
  type QuickFontFile,
  type TranslateCounter,
} from '@/domain/font-set-config'
import { decodeList } from '@/utils/decode'
import { isString } from '@/utils/guards'
import {
  decodeHierarchyFile,
  decodeQuickFontFile,
  decodeTranslateCounter,
} from '@/domain/font-set-config'
import { dataRepo } from './data-repo'
import type { Repo, RepoView } from './types'
import { deepClone } from '@/utils/clone'

export type {
  HierarchyFile,
  HierarchyPreset,
  QuickFont,
  QuickFontFile,
  TranslateCounter,
} from '@/domain/font-set-config'

/** 默认值逐字对齐 app.v4.js:40151-40189 */
const QUICK_FONT_DEFAULTS: QuickFontFile = {
  index: 0,
  list: [
    {
      family: '思源黑体 CN',
      name: 'Source Han Sans CN ExtraLight',
      scriptName: 'SourceHanSansCN-ExtraLight',
      zz: ['ExtraLight', 'Light', 'Normal', 'Regular', 'Medium', 'Bold', 'Heavy'],
      hjm: [
        'SourceHanSansCN-ExtraLight',
        'SourceHanSansCN-Light',
        'SourceHanSansCN-Normal',
        'SourceHanSansCN-Regular',
        'SourceHanSansCN-Medium',
        'SourceHanSansCN-Bold',
        'SourceHanSansCN-Heavy',
      ],
      mz: [
        'Source Han Sans CN ExtraLight',
        'Source Han Sans CN Light',
        'Source Han Sans CN Normal',
        'Source Han Sans CN Regular',
        'Source Han Sans CN Medium',
        'Source Han Sans CN Bold Bold',
        'Source Han Sans CN Heavy Bold',
      ],
    },
    {
      family: '思源宋体 CN',
      name: 'Source Han Serif CN ExtraLight',
      scriptName: 'SourceHanSerifCN-ExtraLight',
      zz: ['ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'Heavy'],
      hjm: [
        'SourceHanSerifCN-ExtraLight',
        'SourceHanSerifCN-Light',
        'SourceHanSerifCN-Regular',
        'SourceHanSerifCN-Medium',
        'SourceHanSerifCN-SemiBold',
        'SourceHanSerifCN-Bold',
        'SourceHanSerifCN-Heavy',
      ],
      mz: [
        'Source Han Serif CN ExtraLight',
        'Source Han Serif CN Light',
        'Source Han Serif CN',
        'Source Han Serif CN Medium',
        'Source Han Serif CN SemiBold',
        'Source Han Serif CN Bold',
        'Source Han Serif CN Heavy',
      ],
    },
    {
      family: '源柔ゴシックX',
      name: 'Gen Jyuu GothicX Bold',
      scriptName: 'GenJyuuGothicX-Bold',
      zz: ['ExtraLight', 'Light', 'Normal', 'Regular', 'Medium', 'Bold', 'Heavy'],
      hjm: [
        'GenJyuuGothicX-ExtraLight',
        'GenJyuuGothicX-Light',
        'GenJyuuGothicX-Normal',
        'GenJyuuGothicX-Regular',
        'GenJyuuGothicX-Medium',
        'GenJyuuGothicX-Bold',
        'GenJyuuGothicX-Heavy',
      ],
      mz: [
        'Gen Jyuu GothicX ExtraLight',
        'Gen Jyuu GothicX Light',
        'Gen Jyuu GothicX Normal',
        'Gen Jyuu GothicX Regular',
        'Gen Jyuu GothicX Medium',
        'Gen Jyuu GothicX Bold',
        'Gen Jyuu GothicX Heavy',
      ],
    },
    {
      family: '阿里巴巴普惠体',
      name: 'Alibaba-PuHuiTi-B',
      scriptName: 'AlibabaPuHuiTiB',
      zz: ['Light', 'Regular', 'Medium', 'Bold', 'Heavy'],
      hjm: [
        'AlibabaPuHuiTiL',
        'AlibabaPuHuiTiR',
        'AlibabaPuHuiTiM',
        'AlibabaPuHuiTiB',
        'AlibabaPuHuiTiH',
      ],
      mz: [
        'Alibaba-PuHuiTi-L',
        'Alibaba-PuHuiTi-R',
        'Alibaba-PuHuiTi-M',
        'Alibaba-PuHuiTi-B',
        'Alibaba-PuHuiTi-H',
      ],
    },
    {
      family: 'OPPOSans',
      name: 'OPPOSans B',
      scriptName: 'OPPOSans-B',
      zz: ['Light', 'Regular', 'Medium', 'Bold', 'Heavy'],
      hjm: ['OPPOSans-L', 'OPPOSans-R', 'OPPOSans-M', 'OPPOSans-B', 'OPPOSans-H'],
      mz: ['OPPOSans L', 'OPPOSans R', 'OPPOSans M', 'OPPOSans B', 'OPPOSans H'],
    },
  ],
}

/** 默认值逐字对齐 app.v4.js:10881-10893 */
const HIERARCHY_DEFAULTS: HierarchyFile = {
  index: 0,
  list: [
    { name: '常规', data: [92, 48, 36, 24, 15, 12] },
    { name: '手机端', data: [72, 50, 28, 20, 16, 10] },
    { name: '等差', data: [90, 60, 40, 27, 18, 12] },
    { name: '强对比', data: [92, 50, 20, 15, 14, 12] },
  ],
}

/** 原版每日 380 次（app.v4.js:42900），不是 1000（1000 是文本长度上限） */
const COUNTER_DEFAULTS: TranslateCounter = { num: 0, max: TRANSLATE_DAILY_LIMIT, time: '' }

const clone = deepClone

/**
 * 生产者自己的默认值。`dataRepo` 的 fallback 形参就是它，坏读时由 `fileRepo` 经
 * `RepoReadBad.fallback` 交给消费侧（T-102）——**消费侧不要直接调这里**，
 * 调了就是绕开仓库自己拼一份默认值（ADR-24）。保留导出只给 `dataRepo` 与测试造坏读桩用。
 */
export const fontExtraDefaults = {
  quickFont: (): QuickFontFile => clone(QUICK_FONT_DEFAULTS),
  hierarchy: (): HierarchyFile => clone(HIERARCHY_DEFAULTS),
  counter: (): TranslateCounter => ({ ...COUNTER_DEFAULTS }),
  history: (): string[] => [],
}

/** 历史记录是纯字符串数组：非数组 / 混进非字符串 → 整份不认识（不 filter，避免写回时丢条目） */
const decodeFontHistory = (raw: unknown) => decodeList(raw, isString)

const quickFontImpl: Repo<QuickFontFile> = dataRepo(
  () => `${userDir()}/${DATA_FILES.ztQuickFont}`,
  fontExtraDefaults.quickFont,
  decodeQuickFontFile,
)

const hierarchyImpl: Repo<HierarchyFile> = dataRepo(
  () => `${userDir()}/${DATA_FILES.ztHierarych}`,
  fontExtraDefaults.hierarchy,
  decodeHierarchyFile,
)

const translateCounterImpl: Repo<TranslateCounter> = dataRepo(
  () => `${userDir()}/${DATA_FILES.ztTranslate}`,
  fontExtraDefaults.counter,
  decodeTranslateCounter,
)

/** 原版 `sj_ztglHistory.json`：最近使用的字体家族，最多 10 个 */
const fontHistoryImpl: Repo<string[]> = dataRepo(
  () => `${userDir()}/${DATA_FILES.ztglHistory}`,
  fontExtraDefaults.history,
  decodeFontHistory,
)

/** 只读视图（store 唯一能拿到的形状）：没有 write / update —— 调用不到 */
export const quickFontRepo: RepoView<QuickFontFile> = quickFontImpl
export const hierarchyRepo: RepoView<HierarchyFile> = hierarchyImpl
export const translateCounterRepo: RepoView<TranslateCounter> = translateCounterImpl
export const fontHistoryRepo: RepoView<string[]> = fontHistoryImpl

/** 写侧句柄：只给 commands（fontSet 的写命令）与 cloud 同步用 */
export const quickFontWriter: Repo<QuickFontFile> = quickFontImpl
export const hierarchyWriter: Repo<HierarchyFile> = hierarchyImpl
export const translateCounterWriter: Repo<TranslateCounter> = translateCounterImpl
export const fontHistoryWriter: Repo<string[]> = fontHistoryImpl

/** 原版 `Jv.getTime()`：日 + 年 + 月，不补零 */
export function dayKey(date: Date = new Date()): string {
  return [date.getDate(), date.getFullYear(), date.getMonth() + 1].join('')
}

/** 跨天清零（原版 checkStatus，app.v4.js:42853-42862） */
export function normalizeCounter(
  counter: TranslateCounter,
  today: string = dayKey(),
): TranslateCounter {
  if (counter.time === today) return counter
  return { num: 0, max: counter.max || COUNTER_DEFAULTS.max, time: today }
}
