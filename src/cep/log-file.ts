// 是什么：日志落盘口（`LogSink` 的磁盘实现）——把每条日志追加进用户目录下的一份文本文件
// 替代了什么：原来只有 200 条内存环形缓冲（PS 一关全没、刷几十条 warn 就把关键那条挤掉）
// 谁在用：`src/main.ts` 启动时 `attachLogSink(createLogFileSink())`；`src/utils/logger.ts` 只认端口
// 禁止：不在这里判业务；不 import 业务模块；写失败**不许**抛给调用方（观测设施不能反噬业务）

import { hasNode, readTextSync, userDir, writeTextFileAtomic } from './fs'
import type { LogSink } from '@/utils/logger'

/**
 * 日志文件（放用户数据目录，和面板自己的偏好同一个家）。
 *
 * 为什么单独一个文件而不是塞进 `sj_v5_ui.json`：日志是高频追加、偏好是低频覆盖写，
 * 混在一起会让每次写日志都重写偏好文件（互相踩）。
 */
const FILE = 'sj_v5_log.txt'

/**
 * 上限策略（写在代码里，不写在文档里）：
 * - **最多 400 行 / 200KB**，两者任一超了就丢；
 * - 丢的时候**先丢最早的非 error 行**：error 是用户报障唯一能用的证据，warn 挤掉它们等于白记；
 * - 全是 error 才丢最早的 error（总得有个上限，否则文件无界增长）;
 * - 只保留**最近**的：磁盘上是"最近发生过什么"，不是"历史全量"——全量该进外部日志系统，
 *   而本仓没有，也不该在这里假装有。
 */
const MAX_LINES = 400
const MAX_BYTES = 200 * 1024

/** 合并写入的节流：日志是高频道调用，每条都落盘会把磁盘打满 */
const FLUSH_MS = 400

function filePath(): string {
  return `${userDir()}/${FILE}`
}

function isErrorLine(line: string): boolean {
  // 行格式由 `logger.oneLine()` 固定：`HH:MM:SS.mmm LEVEL [scope] message`
  return /\sERROR\s\[/.test(line)
}

/** 一行多长都行（detail 已被 logger 截断到 500 字符），这里只算总字节 */
function byteLength(lines: readonly string[]): number {
  let total = 0
  for (const line of lines) total += line.length + 1
  return total
}

/**
 * 建一个落盘口。
 *
 * @param onError 写失败时的通知（logger 用它留一条"日志落盘失败"，**不许静默**）
 */
export function createLogFileSink(onError?: (reason: string) => void): LogSink {
  const lines: string[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  let reported = false

  const report = (reason: string): void => {
    // 每次会话只报第一条：网络盘掉线时每秒几十条同样的话会把日志本身刷满
    if (reported) return
    reported = true
    onError?.(reason)
  }

  /** 超上限就丢：优先丢最早的非 error 行（error 是唯一可用的证据） */
  const trim = (): void => {
    while (lines.length > MAX_LINES || byteLength(lines) > MAX_BYTES) {
      const index = lines.findIndex((line) => !isErrorLine(line))
      lines.splice(index >= 0 ? index : 0, 1)
    }
  }

  const write = (): void => {
    timer = null
    if (!hasNode()) return
    const outcome = writeTextFileAtomic(filePath(), `${lines.join('\n')}\n`)
    if (outcome.status === 'error') report(`写 ${FILE} 失败：${outcome.reason}`)
  }

  const schedule = (): void => {
    if (timer) return
    timer = setTimeout(write, FLUSH_MS)
  }

  // 关面板时把节流里的最后几条冲掉（与偏好 flush 同一个时机）
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (timer) {
        clearTimeout(timer)
        write()
      }
    })
  }

  return {
    load(): string[] {
      if (!hasNode()) return []
      const read = readTextSync(filePath())
      if (read.status === 'notSeen') return []
      // 读不到就交给调用方决定（attachLogSink 会把它记成一条 warn，不静默）
      if (read.status === 'error') throw new Error(`${FILE} 读不到：${read.reason}`)
      const persisted = read.text.split('\n').filter((line) => line.trim() !== '')
      // 只回最近的：文件被外部改大过也不把内存撑爆
      return persisted.slice(-MAX_LINES)
    },
    append(line: string): void {
      lines.push(line)
      trim()
      schedule()
    },
  }
}
