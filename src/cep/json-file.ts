import { readTextSmart, userDir, writeTextFile } from './fs'
import { log } from '@/utils/logger'

/**
 * 一个 JSON 数据文件的读写封装。
 *
 * 为什么要有它：`ps.ts` 里 4 个函数、`prefs.ts` 里 1 个，都在重复同一套
 * 「读文本 → JSON.parse（失败回退）→ 改 → 备份 → 写回」。
 * 备份这种事不该靠每个函数自己记得。
 *
 * 注意：读用 `readTextSmart`（异步，Node 不可用时走 jsx），
 * 写用 `writeTextFile`（同步，只在 Node 可用时有效）。
 */
export interface JsonFileOptions {
  /** 写之前把原文备份成 .bak，默认开 */
  backup?: boolean
}

export function jsonFile<T>(name: string, fallback: () => T, opts: JsonFileOptions = {}) {
  const backup = opts.backup !== false
  const path = () => `${userDir()}/${name}`

  async function readRaw(): Promise<{ text: string | null; value: T }> {
    let text: string | null = null
    try {
      text = await readTextSmart(path())
    } catch (e) {
      log.warn('jsonFile', `${name} 读取失败`, e)
    }

    if (!text) return { text: null, value: fallback() }

    try {
      return { text, value: JSON.parse(text) as T }
    } catch (e) {
      log.warn('jsonFile', `${name} 不是合法 JSON，使用默认值`, e)
      return { text, value: fallback() }
    }
  }

  async function read(): Promise<T> {
    return (await readRaw()).value
  }

  function write(value: T, previous?: string | null) {
    try {
      if (backup && previous) writeTextFile(`${path()}.bak`, previous)
      writeTextFile(path(), JSON.stringify(value))
    } catch (e) {
      log.error('jsonFile', `${name} 写入失败`, e)
      throw e
    }
  }

  /** 读 → 改 → 写。mutator 直接改传入的对象，返回值可省略 */
  async function update(mutator: (value: T) => T | void): Promise<T> {
    const { text, value } = await readRaw()
    const result = mutator(value)
    const next = (result === undefined ? value : result) as T
    write(next, text)
    return next
  }

  return { read, update, write, path }
}
