import { hasCep } from './eval-script'
import { readTextFile, userDir, writeTextFile } from './fs'
import { log } from '@/utils/logger'

/**
 * 面板自己的界面偏好，独立一个文件，不去动原面板的 sj_set.json。
 * 在 PS 里写到 %APPDATA%\SheJiZhuLi\sj_v5_ui.json，浏览器里退回 localStorage。
 */
const FILE = 'sj_v5_ui.json'
const LS_KEY = 'psz:v5:ui'

let cache: Record<string, unknown> | null = null

function filePath(): string {
  return `${userDir()}/${FILE}`
}

function loadAll(): Record<string, unknown> {
  if (cache) return cache

  if (!hasCep()) {
    try {
      cache = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Record<string, unknown>
    } catch {
      cache = {}
    }
    return cache
  }

  try {
    const text = readTextFile(filePath())
    cache = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch (e) {
    log.warn('prefs', '读取偏好失败，使用默认值', e)
    cache = {}
  }
  return cache
}

export function getPref<T>(key: string, fallback: T): T {
  const value = loadAll()[key]
  return value === undefined ? fallback : (value as T)
}

export function setPref(key: string, value: unknown) {
  const all = loadAll()
  all[key] = value

  if (!hasCep()) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(all))
    } catch {
      /* 忽略 */
    }
    return
  }

  try {
    writeTextFile(filePath(), JSON.stringify(all))
  } catch (e) {
    log.warn('prefs', '写入偏好失败', e)
  }
}
