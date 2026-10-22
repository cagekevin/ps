import { hasCep } from '@/cep/transport'
import { readTextFile, userDir, writeTextFile, writeTextFileAtomic } from '@/cep/fs'
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
    const text = readTextFile(filePath())
    cache = text ? (JSON.parse(text) as Record<string, unknown>) : {}
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

/** 同步写，只在关闭面板时用（beforeunload 里等不了异步） */
function persistSync(all: Record<string, unknown>) {
  try {
    const text = JSON.stringify(all)
    if (!hasCep()) {
      localStorage.setItem(LS_KEY, text)
      return
    }
    const target = filePath()
    if (!writeTextFileAtomic(target, text)) writeTextFile(target, text)
  } catch (e) {
    notifyError(e)
  }
}

function persist(all: Record<string, unknown>) {
  const text = JSON.stringify(all)
  writeQueue = writeQueue.then(() => {
    try {
      if (!hasCep()) {
        localStorage.setItem(LS_KEY, text)
        return
      }
      const target = filePath()
      if (!writeTextFileAtomic(target, text)) writeTextFile(target, text)
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
