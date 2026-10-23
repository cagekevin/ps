// 是什么：原面板 sj_set.json 的字体面板字段（读 + 局部写）
// 唯一入口：只有这里读写 sj_set.json；命令层 import 这里的函数，不拼路径
// 替代了什么：原版 `V.a.info`（全局设置对象，app.v4.js:65835-65866）
// 谁在用：commands/fontSet.ts、stores/font-set.ts
// 禁止：整文件覆写成只含本页字段的对象——原面板还有几十个键，写前必须保留未知键

import { DATA_FILES } from '@/cep/env'
import { CepError } from '@/utils/errors'
import { readTextSmart, userDir } from '@/cep/fs'
import { FONT_SET_DEFAULTS, type FontSetSettings } from '@/domain/font-set-config'
import { pick } from './pick'
import type { Repo, RepoRead } from './types'

export type {
  CreateButtonConfig,
  FontSetSettings,
  PasteFontConfig,
  TranslateConfig,
} from '@/domain/font-set-config'
export { FONT_SET_DEFAULTS } from '@/domain/font-set-config'

/**
 * 用整份对象做仓库类型，是为了 `update` 时**未知键不被丢掉**。
 * 原面板同时写这个文件（目标架构 W3），只认识本页字段就整写等于删数据。
 */
export const legacySettingsRepo: Repo<Record<string, unknown>> = pick(
  () => `${userDir()}/${DATA_FILES.ztSet}`,
  () => ({}),
  () => ({}),
  { requireExisting: true },
)

function array6(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value) || value.length !== 6) return [...fallback]
  return value.map((item, index) => {
    const n = Number(item)
    return Number.isFinite(n) ? n : fallback[index]
  })
}

function numbers(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value) || !value.length) return [...fallback]
  const parsed = value.map(Number).filter((n) => Number.isFinite(n))
  return parsed.length ? parsed : [...fallback]
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback
}

/** 把磁盘上的整份设置合并成字体面板可用的强类型快照；未知键忽略 */
export function mergeFontSetSettings(
  raw: Record<string, unknown> | null | undefined,
): FontSetSettings {
  const source = raw ?? {}
  const paste = (source.ztPasteFont ?? {}) as Record<string, unknown>
  const button = (source.ztCreateButton ?? {}) as Record<string, unknown>
  const translate = (source.ztTranslate ?? {}) as Record<string, unknown>

  return {
    ztHierarych: array6(source.ztHierarych, FONT_SET_DEFAULTS.ztHierarych),
    ztPasteFont: {
      scriptFamily: bool(paste.scriptFamily, true),
      color: bool(paste.color, true),
      opacity: bool(paste.opacity, true),
      size: bool(paste.size, true),
      leading: bool(paste.leading, true),
      tracking: bool(paste.tracking, true),
    },
    ztCreateButton: {
      type: Number(button.type) === 1 ? 1 : 2,
      isLine: bool(button.isLine, false),
      padding: str(button.padding, FONT_SET_DEFAULTS.ztCreateButton.padding),
    },
    ztTranslate: {
      from: str(translate.from, 'auto'),
      to: str(translate.to, 'auto'),
      delete: bool(translate.delete, true),
    },
    ztDistributedIsFixed: bool(source.ztDistributedIsFixed, false),
    ztDistributionFilter: bool(source.ztDistributionFilter, true),
    ztDefaultSize: numbers(source.ztDefaultSize, FONT_SET_DEFAULTS.ztDefaultSize),
    ztDefaultLeading: numbers(source.ztDefaultLeading, FONT_SET_DEFAULTS.ztDefaultLeading),
    ztDefaultTracking: numbers(source.ztDefaultTracking, FONT_SET_DEFAULTS.ztDefaultTracking),
    ztShowQuick: bool(source.ztShowQuick, true),
    ztShowCustom: bool(source.ztShowCustom, true),
    ztPreview: Number.isFinite(Number(source.ztPreview)) ? Number(source.ztPreview) : 0,

    ztExpandMultiple: bool(source.ztExpandMultiple, true),
    ztOldVersion: bool(source.ztOldVersion, false),
    appUnit: str(source.appUnit, 'px'),
  }
}

export async function readFontSetSettings(): Promise<RepoRead<FontSetSettings>> {
  const { value, degraded } = await legacySettingsRepo.read()
  return { value: mergeFontSetSettings(value), degraded }
}

/**
 * 云同步专用：文件必须真实存在。
 * 缺文件时页面可以显示默认值，但同步不能把默认值当成用户数据上传。
 */
export async function readFontSetSettingsForSync(): Promise<FontSetSettings> {
  const text = await readTextSmart(`${userDir()}/${DATA_FILES.ztSet}`)
  if (text === null) throw new Error(`${DATA_FILES.ztSet} 不存在`)
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`${DATA_FILES.ztSet} 不是合法 JSON`)
  }
  return mergeFontSetSettings(raw)
}

/** 只改动本页字段，其余键原样写回 */
export async function patchFontSetSettings(
  patch: Partial<FontSetSettings>,
): Promise<FontSetSettings> {
  const next = await legacySettingsRepo.update((all) => {
    Object.assign(all, patch)
  })
  return mergeFontSetSettings(next)
}

/**
 * 常用页在 `sj_set.json` 里的 17 个键。
 *
 * 来源：原版各子面板调 `getKey("cy…")` 的实参（`cyAutoFillColor` / `cyDeleteNext` / `cyExport` /
 * `cyImportToLinkObject` / `cyLinkObject` / `cyOptimizeAll` / `cyOptimizeDeleteAllEmpty` /
 * `cyOptimizeDeleteAllHide`）。`cyExport` 里存的是导出配置，**形状由面板自己决定，这里不解释**。
 */
export const COMMON_USE_SETTING_KEYS = [
  'cyAutoFillColor',
  'cyClipMaskAutoEmbed',
  'cyDeleteNext',
  'cyDragInAutoEmbed',
  'cyExport',
  // comexport 三个折叠区状态（官方 set.cyShowCompress :36664 / cyShowSetFolder :36757 / cyShowBatch :36787）
  'cyShowBatch',
  'cyShowCompress',
  'cyShowSetFolder',
  // 常用页两块区域的显隐：官方 `:35430`/`:35522` 两行绑 cyShowZoom、`:35614` 变换区绑 cyShowTransformation；
  // 开关在 /set「常用功能面板」`:61445-61449`/`:61454-61458`，默认值 `:65813`/`:65814` 都是 true
  'cyShowTransformation',
  'cyShowZoom',
  'cyImportToLinkObject',
  'cyLinkObject',
  'cyOpenDranInToLinkObject',
  'cyOptimizeAll',
  'cyOptimizeDeleteAllEmpty',
  'cyOptimizeDeleteAllHide',
  'cyPasetImageAutoEmbed',
] as const

export type CommonUseSettingKey = (typeof COMMON_USE_SETTING_KEYS)[number]
export type CommonUseOptions = Record<CommonUseSettingKey, unknown>

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 深合并：**递归到叶子**，数组**整体替换**，深对象**绝不整块替换**。
 *
 * 为什么不能 `Object.assign`：`cyExport` / `cyAutoFillColor` 这类是嵌套对象，
 * 整块替换等于把用户没改的分支删掉（原版是 `deepmerge` 语义，见 `:37619-37624` 的写入侧）。
 */
function assignDeep(target: Record<string, unknown>, patch: Record<string, unknown>): void {
  for (const [key, next] of Object.entries(patch)) {
    if (next === undefined) continue
    const current = target[key]
    if (isPlainRecord(next) && isPlainRecord(current)) {
      assignDeep(current, next)
    } else {
      target[key] = next
    }
  }
}

/** 读常用页那 8 个键；文件里没有的键**不补默认值**（缺 = 官方默认，由面板决定） */
export async function readCommonUseOptions(): Promise<{
  value: Partial<CommonUseOptions>
  /** 非空表示读到的是坏文件（UI 要提示），与 RepoRead 同义 */
  degraded?: string
}> {
  const { value, degraded } = await legacySettingsRepo.read()
  const picked: Partial<CommonUseOptions> = {}
  for (const key of COMMON_USE_SETTING_KEYS) {
    if (value && key in value) picked[key] = value[key]
  }
  return { value: picked, degraded }
}

/**
 * 只写这 8 个键；其余键（原面板还有几十个）原样保留。
 * 未知键直接拒绝——写进去就是污染别人的设置文件。
 */
export async function updateCommonUseOptions(
  patch: Partial<CommonUseOptions>,
): Promise<Partial<CommonUseOptions>> {
  const unknown = Object.keys(patch).filter(
    (key) => !COMMON_USE_SETTING_KEYS.includes(key as CommonUseSettingKey),
  )
  if (unknown.length) {
    throw new CepError('PARSE', `不认识的常用页设置键：${unknown.join('、')}`)
  }
  const next = await legacySettingsRepo.update((all) => {
    assignDeep(all, patch as Record<string, unknown>)
  })
  const picked: Partial<CommonUseOptions> = {}
  for (const key of COMMON_USE_SETTING_KEYS) {
    if (key in next) picked[key] = next[key]
  }
  return picked
}
