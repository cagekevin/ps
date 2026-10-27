// 是什么：日志落盘口（磁盘实现）——把每条日志追加进用户目录下的一份文本文件
// 替代了什么：内存环形缓冲（PS 一关全没、刷几十条 warn 就把关键那条挤掉）已删除，现落盘到文本文件
// 谁在用：`src/utils/logger.ts` **自己 import 本模块并在模块顶层装上**（反向注册）。
//   外面（业务层 / main.ts）不需要、也没有任何 API 可以参与装配。
// 禁止：不在这里判业务；不 import 业务模块；**不 import logger**（那会成环）；
//   写失败**不许**抛给调用方（观测设施不能反噬业务）—— 由 logger 接住并记成一条 warn。

import { hasNode } from './node'
import { describeReadFailure, readOwnFileText } from './fs-read'
import { userDir } from './paths'
import { DATA_FILES } from './env'
import { writeDiskSync } from './disk-write'

/**
 * 落盘口：logger 需要的两件事。
 *
 * - `load()` —— 启动时读回上一次会话留在盘上的行（重开后面板仍能 dump 到）
 * - `append(line)` —— 追加一行（实现方负责节流 / 上限 / 失败自留痕）
 *
 * 它是**普通形状**（没有品牌）：因为**根本没有"装 sink"这个 API 给人调** ——
 * logger 在自己模块顶层 import 本模块并装上，外面既无 API 可调、也无从伪造。
 * 品牌要防的是"外面能自己造一个 sink 顶掉真的"，而那个入口已经不存在了。
 */
export interface DiskLogSink {
  load(): string[]
  append(line: string): void
}

/**
 * 日志文件（放用户数据目录，和面板自己的偏好同一个家）。
 *
 * 为什么单独一个文件而不是塞进 `sj_v5_ui.json`：日志是高频追加、偏好是低频覆盖写，
 * 混在一起会让每次写日志都重写偏好文件（互相踩）。
 */
const FILE = DATA_FILES.logFile

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
/**
 * 造一个落盘口。**只提供实现，不含任何"装配"动作** ——
 * 谁需要就 import 它；`utils/logger.ts` 在自己模块顶层调它并装上（那是它的事）。
 *
 * @param onError 写失败时的通知（logger 用它留一条"日志落盘失败"，**不许静默**）
 */
export function createLogFileSink(onError?: (reason: string) => void): DiskLogSink {
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
    // 日志落盘也走**唯一写盘入口**（`previous: null` = 覆盖写、无 `.bak` 概念）。
    // 观测设施不许把失败抛给业务 ⇒ 在这里兜住并 report。
    try {
      writeDiskSync(filePath(), `${lines.join('\n')}\n`, {
        backup: { mode: 'none', why: '日志无退路价值，.bak 只会占磁盘' },
        cas: { mode: 'skip', why: '日志是覆盖写，丢一次只影响调试信息' },
      })
    } catch (e) {
      // 落盘失败只进**日志**（`onError` → `noteSinkFailure` → 一条 warn 进缓冲 + 控制台），**不弹 toast**：
      // 日志系统自己坏了还去弹提示，网络盘掉线时会刷屏（`report` 每次会话只报第一条）。
      // 所以这**不是静默吞**（有上报），只是上报的载体是日志而不是用户提示。
      report(`写 ${FILE} 失败：${e instanceof Error ? e.message : String(e)}`)
    }
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
    load: () => {
      if (!hasNode()) return []
      // `readOwnFileText` 只读 userDir 内的文件；日志不是 JSON，进不了 `readRepoFile`
      const read = readOwnFileText(filePath())
      if (read.status === 'notSeen') return []
      // 读不到就交给调用方决定（logger 会把它记成一条 warn，不静默）
      if (read.status === 'error')
        throw new Error(`${FILE} 读不到：${describeReadFailure(read.failure)}`)
      const persisted = read.value.split('\n').filter((line) => line.trim() !== '')
      // 只回最近的：文件被外部改大过也不把内存撑爆
      return persisted.slice(-MAX_LINES)
    },
    append: (line: string) => {
      lines.push(line)
      trim()
      schedule()
    },
  }
}
