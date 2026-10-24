/**
 * 统一日志。CEP 里没法刷新页面，出问题只能靠控制台 + 这份缓冲 + **落盘**。
 *
 * 三层，各管一段（别混）：
 * - **内存缓冲**（最近 200 条）：DebugLog 与 `__pszDump()` 的现场，回答"刚刚发生了什么"；
 * - **落盘**（`LogSink`，由 `main.ts` 注入 `cep/log-file.ts`）：回答"关掉重开之后还查得到吗"——
 *   没有它，用户报"刚才出错了"时谁也拿不到证据，前面二十多条"零痕迹"的债根子都在这；
 * - **控制台**：开发时看的东西，不是给用户的。
 *
 * 落盘**不许反噬业务**：写失败只在这里留一条 warn，绝不抛给调用方；也**不许静默**
 * （失败那条 warn 会进内存缓冲，DebugLog 看得见）。
 */
type Level = 'debug' | 'info' | 'warn' | 'error'

interface Entry {
  time: string
  level: Level
  scope: string
  message: string
  detail?: unknown
}

const MAX_ENTRIES = 200
const buffer: Entry[] = []

/**
 * 落盘端口。**注入**而不是 import `cep/fs`：logger 是 `utils/` 最底层，
 * 一旦自己 import 适配层，所有 import logger 的模块都会连带拉进 `cep/transport`。
 * 装配点在 `main.ts`（与偏好写失败的通知同一个地方）。
 */
export interface LogSink {
  /** 启动时读回上一次会话留下的行（重开后面板仍能 dump 到） */
  load(): string[]
  /** 追加一行（实现方负责节流 / 上限 / 失败自留痕） */
  append(line: string): void
}

let sink: LogSink | null = null
/** 上一次会话留在盘上的行；`dump()` 拼在内存缓冲之前 */
const history: string[] = []
const SINK_SCOPE = 'logger'
/** 落盘失败只喊一次：掉线时每秒几十条同样的话会把日志本身刷满 */
let sinkFailureReported = false

function stamp(): string {
  const d = new Date()
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

/** 一条日志的落盘/展示形态（**唯一一份**：dump 与落盘共用，改格式只改这里） */
function oneLine(entry: Entry): string {
  const head = `${entry.time} ${entry.level.toUpperCase()} [${entry.scope}] ${entry.message}`
  if (entry.detail === undefined) return head
  // Error 单独处理：`JSON.stringify(new Error('x'))` 是 `{}`，原因会被序列化吃掉
  // （"有痕迹但没原因"等于又要用户复现一次）
  if (entry.detail instanceof Error) {
    const { name, message } = entry.detail
    return `${head} ${name}: ${message}`
  }
  try {
    // 事件回调的 data 可能很长，截断到 500 字符，够定位即可
    const text = JSON.stringify(entry.detail)
    return `${head} ${text.length > 500 ? `${text.slice(0, 500)}…` : text}`
  } catch {
    return `${head} [detail 不可序列化]`
  }
}

/** 落盘失败：进内存缓冲（用户看得见）+ 控制台一次；**不再回调 sink**，否则自己写自己 */
function noteSinkFailure(reason: string): void {
  // 只留**一条**：掉线/磁盘满时每次写都会失败，逐条记会把日志本身刷满，
  // 反而挤掉真正要查的那几条。这条已经说明"本次会话只留内存"，足够定位。
  if (sinkFailureReported) return
  sinkFailureReported = true
  buffer.push({
    time: stamp(),
    level: 'warn',
    scope: SINK_SCOPE,
    message: `日志落盘失败，本次会话只留内存：${reason}`,
  })
  if (buffer.length > MAX_ENTRIES) buffer.shift()
  console.warn(`[psz][${SINK_SCOPE}] 日志落盘失败：${reason}`)
}

function record(level: Level, scope: string, message: string, detail?: unknown) {
  const entry: Entry = { time: stamp(), level, scope, message, detail }
  buffer.push(entry)
  if (buffer.length > MAX_ENTRIES) buffer.shift()

  const line = `[psz][${scope}] ${message}`
  if (level === 'error') console.error(line, detail ?? '')
  else if (level === 'warn') console.warn(line, detail ?? '')
  // debug / info 只在开发环境输出：面板的控制台是给用户看的，不该被日志刷屏
  // 这里是全项目唯一的 console 出口，业务代码只准调 log.*
  // eslint-disable-next-line no-console
  else if (import.meta.env.DEV) console.log(line, detail ?? '')

  // 落盘：失败**吞掉**（观测设施不能反噬业务），但留一条 warn
  if (sink && scope !== SINK_SCOPE) {
    try {
      sink.append(oneLine(entry))
    } catch (e) {
      noteSinkFailure(e instanceof Error ? e.message : String(e))
    }
  }
}

/**
 * 装配落盘口。启动时调一次（`main.ts`），之后每条日志都会追加。
 *
 * `load()` 失败也算落盘失败：读不到上次历史 = "关掉重开查不到"，同样是观测缺口，必须喊出来。
 */
export function attachLogSink(next: LogSink): void {
  sink = next
  try {
    const lines = next.load()
    history.length = 0
    history.push(...lines)
  } catch (e) {
    noteSinkFailure(e instanceof Error ? e.message : String(e))
  }
}

/** 仅测试用：卸掉落盘口并清历史，模拟"面板重开前把状态清干净" */
export function __resetLoggerForTest(): void {
  sink = null
  history.length = 0
  buffer.length = 0
  sinkFailureReported = false
}

export const log = {
  debug: (scope: string, message: string, detail?: unknown) =>
    record('debug', scope, message, detail),
  info: (scope: string, message: string, detail?: unknown) =>
    record('info', scope, message, detail),
  warn: (scope: string, message: string, detail?: unknown) =>
    record('warn', scope, message, detail),
  error: (scope: string, message: string, detail?: unknown) =>
    record('error', scope, message, detail),
  /** 上次会话的历史 + 本次会话的现场（用户报障要的就是这两段） */
  dump(): string {
    return [...history, ...buffer.map(oneLine)].join('\n')
  },
  clear() {
    buffer.length = 0
    history.length = 0
  },
}

// 方便在 CEP 的 devtools 里直接敲 __pszDump()（类型在 src/env.d.ts 的 Window）
window.__pszDump = () => log.dump()
