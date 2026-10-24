import { hasCep } from '@/cep/transport'
import { readTextSync, userDir, writeTextFileAtomic } from '@/cep/fs'
import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'

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
const FILE = 'sj_v5_ui.json'
const LS_KEY = 'psz:v5:ui'
const FLUSH_DELAY = 300
/** 偏好文件结构版本；以后字段迁移靠它，不靠猜 */
export const PREFS_VERSION = 1

let cache: Record<string, unknown> | null = null
/**
 * 读失败的原因；非空 = **本次会话禁止写回**（TD-09-23）。
 *
 * 读不到时内存里给默认值，UI 照旧能用；但一旦把这份默认值写回去，用户原有偏好就没了 ——
 * 所以"读不到"与"新装机没有偏好"必须分开：后者可以写，前者不许写。
 */
let readFailure = ''
let readFailureReported = false
let timer: ReturnType<typeof setTimeout> | null = null
let writeQueue: Promise<void> = Promise.resolve()
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
      cache = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Record<string, unknown>
    } catch (e) {
      log.warn('settings', '本地偏好解析失败，使用默认值', e)
      cache = {}
    }
    normalizeVersion(cache)
    return cache
  }

  try {
    // 同步读是 ADR-26 ④ 的具名例外之三：`getPref` / `settingsSnapshot` 全链路同步。
    // 三态在此分流：`notSeen`（新装机）→ 默认值且允许写回；`error`（读不到）→ 默认值但**禁止写回**。
    const read = readTextSync(filePath())
    if (read.status === 'error') {
      // 读不到 ≠ 没有（ADR-0014）：`cache = {}` 只是给 UI 的默认值，`readFailure` 挡住写回。
      // 具体提示文案与交互归 1c，这里只保证"不会拿默认值覆盖用户文件"。
      readFailure = read.reason
      cache = {}
    } else {
      cache = read.status === 'ok' ? (JSON.parse(read.text) as Record<string, unknown>) : {}
    }
  } catch (e) {
    log.warn('settings', '读取偏好失败，使用默认值', e)
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
    notifyError(
      new CepError('IO', `偏好文件读不到，本次不保存偏好（避免默认值覆盖原文件）：${readFailure}`),
    )
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
    // 原子写失败就报错：旧实现退回普通写，等于把 rename 保护摘掉（TD-09-27）
    const written = writeTextFileAtomic(target, text)
    if (written.status === 'error') throw new CepError('IO', `偏好写入失败：${written.reason}`)
  } catch (e) {
    notifyError(e)
  }
}

function persist(all: Record<string, unknown>) {
  const text = JSON.stringify(all)
  writeQueue = writeQueue.then(() => {
    if (refuseIfReadFailed()) return
    try {
      if (!hasCep()) {
        localStorage.setItem(LS_KEY, text)
        return
      }
      const target = filePath()
      const written = writeTextFileAtomic(target, text)
      if (written.status === 'error') throw new CepError('IO', `偏好写入失败：${written.reason}`)
    } catch (e) {
      notifyError(e)
    }
  })
}

/** 只读快照，给命令层用；调用方不要改它 */
export function settingsSnapshot(): Record<string, unknown> {
  return { ...loadAll() }
}

/** 仅测试用：清掉内存缓存 */
export function __resetSettingsForTest() {
  cache = null
  readFailure = ''
  readFailureReported = false
}

export function getPref<T>(key: string, fallback: T): T {
  const value = loadAll()[key]
  return value === undefined ? fallback : (value as T)
}

export function setPref(key: string, value: unknown) {
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
