import { hasCep } from '@/cep/transport'
import { userDir } from '@/cep/paths'
import { DATA_FILES } from '@/cep/env'
import { writeDiskSync } from '@/cep/disk-write'
import { foldAbsent, readRepoFile } from './repo-read'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { isRecord } from '@/utils/guards'
import { log } from '@/utils/logger'
import { shapeFail, type Decoder } from '@/utils/decode'

/**
 * 面板自己的界面偏好，独立一个文件，不动原面板的 sj_set.json。
 *
 * 同步读 + 防抖写：
 * - 读必须同步（`usePersistedRef` 在 store setup 里初始化，不能 await）
 * - 写异步落盘，300ms 防抖；关面板时同步 flush，否则最后几次改动会丢
 * - 写失败**不再静默**：进日志 + 通过 `onSettingsWriteError` 交给 UI 提示
 *
 * 浏览器（无 CEP）退回 localStorage，仅 dev 使用。
 */
const FILE = DATA_FILES.uiPrefs

/**
 * 偏好文件的 `decode`（**必填**，见 `./repo-read`）：顶层必须是对象。
 *
 * 不在这里补默认键：缺哪个键由 `getPref(key, fallback)` 的调用方决定，
 * 这一层只回答"这份文件能不能当 `Record<string, unknown>` 用"。
 */
const decodePrefs: Decoder<Record<string, unknown>> = (raw) =>
  isRecord(raw) ? { value: raw } : shapeFail('', 'object', raw)
const LS_KEY = 'psz:v5:ui'
const FLUSH_DELAY = 300
/** 偏好文件结构版本；以后字段迁移靠它，不靠猜 */
export const PREFS_VERSION = 1

let cache: Record<string, unknown> | null = null
/**
 * 读失败的原因；非空 = **本次会话禁止写回**。
 *
 * 读不到时内存里给默认值，UI 照旧能用；但一旦把这份默认值写回去，用户原有偏好就没了 ——
 * 所以"读不到"与"新装机没有偏好"必须分开：后者可以写，前者不许写。
 */
let readFailure = ''
let readFailureReported = false
let timer: ReturnType<typeof setTimeout> | null = null

const errorListeners = new Set<(message: string) => void>()

function notifyError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e)
  log.error('settings', '偏好写入失败', e)
  for (const listener of errorListeners) listener(message)
}

/** 装配层注册一次（main.ts），把写失败变成可见提示 */
export function onSettingsWriteError(listener: (message: string) => void): () => void {
  errorListeners.add(listener)
  return () => {
    errorListeners.delete(listener)
  }
}

function filePath(): string {
  return `${userDir()}/${FILE}`
}

function loadAll(): Record<string, unknown> {
  if (cache) return cache

  if (!hasCep()) {
    try {
      // 不许 `as Record<string, unknown>`：先 parse 成 unknown，再由通用判据收窄
      const parsed: unknown = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
      if (!isRecord(parsed)) throw new Error('顶层不是对象')
      cache = parsed
    } catch (e) {
      log.warn('settings', '本地偏好解析失败，使用默认值', e)
      cache = {}
    }
    normalizeVersion(cache)
    return cache
  }

  // 偏好文件就是**我们的 JSON 数据文件**，所以走档 1 的唯一结论入口（`decode` 必填），
  // 不再在这里自己写一遍「三态分流 + parse + 判对象」—— 那是 `file-repo` 的第二份判据。
  const read = foldAbsent(readRepoFile(filePath(), decodePrefs), () => ({}))
  if (read.ok) {
    cache = read.value
  } else {
    // 读不到 / 坏文件 ⇒ 给 UI 默认值，但**本次会话禁止写回**：
    // 拿默认值写回去 = 用户原有偏好没了。
    readFailure = read.reason
    cache = {}
  }
  normalizeVersion(cache)
  return cache
}

/** 只补版本字段，不改已有键；旧文件读入后仍按原键工作 */
function normalizeVersion(all: Record<string, unknown>) {
  if (all.__version === PREFS_VERSION) return
  all.__version = PREFS_VERSION
}

/**
 * 读失败过就拒绝写盘。返回 true = 已拒绝（调用方直接 return）。
 *
 * 为什么不是"再试一次读"：此刻仍然读不到，重试只会把同一次失败重复一遍；
 * 而放行写入的后果是**不可恢复**的（用户偏好被默认值覆盖），拒绝的后果只是本次不保存。
 */
function refuseIfReadFailed(): boolean {
  if (!readFailure) return false
  if (!readFailureReported) {
    readFailureReported = true
    notifyError(new CepError('IO', msg.data.fn.prefReadFailedSkipSave(readFailure)))
  } else {
    log.warn('settings', '偏好读不到，本次仍不保存', readFailure)
  }
  return true
}

/** 同步写，只在关闭面板时用（beforeunload 里等不了异步） */
function persistSync(all: Record<string, unknown>) {
  if (refuseIfReadFailed()) return
  try {
    const text = JSON.stringify(all)
    if (!hasCep()) {
      localStorage.setItem(LS_KEY, text)
      return
    }
    const target = filePath()
    // 原子写失败就报错：旧实现退回普通写，等于把 rename 保护摘掉
    // 偏好文件是覆盖写、无 `.bak` 概念（`previous: null`）
    try {
      writeDiskSync(target, text, { previous: null })
    } catch (error) {
      throw new CepError(
        'IO',
        msg.data.fn.prefWriteFailed(error instanceof Error ? error.message : String(error)),
      )
    }
  } catch (e) {
    notifyError(e)
  }
}

function persist(all: Record<string, unknown>) {
  const text = JSON.stringify(all)
  // 同步落盘：没有 `.then` 的"延后一拍"。以前那条 `writeQueue` 是自建的第二条链
  // （`write-queue.ts` 头写着「不许自己再造一条链」，它造了），而任务体本来就是同步的
  // ⇒ 那层 `.then` 只把写延后一拍，从没起过并发保护作用。
  if (refuseIfReadFailed()) return
  try {
    if (!hasCep()) {
      localStorage.setItem(LS_KEY, text)
      return
    }
    const target = filePath()
    try {
      writeDiskSync(target, text, { previous: null })
    } catch (error) {
      throw new CepError(
        'IO',
        msg.data.fn.prefWriteFailed(error instanceof Error ? error.message : String(error)),
      )
    }
  } catch (e) {
    // 失败必须让用户看见（`notifyError` 走统一 toast），不是吞掉
    notifyError(e)
  }
}

/**
 * 界面偏好键的**唯一清单**。
 *
 * 以前 `getPref(key: string)`：拼错一个字母不报错、不崩，只是"这个设置项永远不生效"——
 * 最贵的一类 bug（页面明明设了，重启就回默认）。现在 key 是联合类型，
 * 拼错在 `npm run typecheck` 就红；加新偏好必须先登记到这里（一行）。
 *
 * 命名是**历史原样**（`cmmSwitchindex` / `dzShowListType` / `styleShowTab` 这些是原版键名），
 * 不改名——它们就是用户 `sj_v5_ui.json` 里的键，改名等于丢用户设置。
 */
export type PrefKey =
  // 左侧栏
  | 'nav.hidden'
  | 'nav.tips'
  | 'nav.hoverSwitch'
  | 'nav.autoJump'
  // 字体
  | 'font.previewMode'
  | 'font.previewText'
  // 各页界面状态（原版键名）
  | 'styleShowTab'
  | 'action.guideDone'
  | 'cmmSwitchindex'
  | 'cmmShowColorSign'
  | 'dzShowListType'
  | 'commonUse.collapsed'
  // 云同步
  | 'cloud.pending'
  | 'cloud.gasUrl'
  | 'cloud.autoSync'

/** 仅测试用：清掉内存缓存 */
export function __resetSettingsForTest() {
  cache = null
  readFailure = ''
  readFailureReported = false
}

export function getPref<T>(key: PrefKey, fallback: T): T {
  const value = loadAll()[key]
  return value === undefined ? fallback : (value as T)
}

export function setPref(key: PrefKey, value: unknown) {
  const all = loadAll()
  all[key] = value

  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    persist(all)
  }, FLUSH_DELAY)
}

/** 关面板前把防抖里的改动同步落盘 */
export function flushPrefs() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (cache) persistSync(cache)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPrefs)
}

/**
 * 常用页折叠态：键名 `commonUse.collapsed`，值是 `{ [面板或项 id]: boolean }`。
 *
 * **落在这里（`sj_v5_ui.json`），不落官方 `sj_set.json`**：折叠是我们的界面偏好，
 * 官方文件是同装的原面板也在写的，混进去等于给别人的数据加字段（决策 D2=A）。
 */
export const COMMON_USE_COLLAPSED_KEY = 'commonUse.collapsed'

/** 读折叠态；坏值当空对象（不抛——偏好丢了只影响展开状态，不影响数据） */
export function getCommonUseCollapsed(): Record<string, boolean> {
  const raw = getPref<unknown>(COMMON_USE_COLLAPSED_KEY, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: Record<string, boolean> = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') result[id] = value
  }
  return result
}

/** 写折叠态（整体替换这一项；`setPref` 自带 300ms 防抖 + 关面板 flush） */
export function setCommonUseCollapsed(next: Record<string, boolean>): void {
  setPref(COMMON_USE_COLLAPSED_KEY, next)
}
