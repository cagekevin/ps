/**
 * 统一日志。CEP 里没法刷新页面，出问题只能靠控制台 + 这份缓冲 + **落盘**。
 *
 * **这是「日志」能力的唯一入口（深模块）**：本模块**只导出 `log` 一个东西**
 * （`debug/info/warn/error/dump`）。落盘实现、落盘口的形状、装配、上一会话历史、
 * `__pszDump` 全在模块内部 —— **外面看不见，也没有"装配"这种 API 可调**。
 * 判据见 `tests/utils/logger-surface.test.ts`。
 *
 * 三层，各管一段（别混）：
 * - **内存缓冲**（最近 200 条）：DebugLog 与 `__pszDump()` 的现场，回答"刚刚发生了什么"；
 * - **落盘**（由 `cep/log-file.ts` **自己接上**）：回答"关掉重开之后还查得到吗"——
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

import { createLogFileSink, type DiskLogSink } from '@/cep/log-file'

let sink: DiskLogSink | null = null
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
 * **模块顶层把落盘口装上** —— 装配**不是一个动作**，没有谁去调它。
 *
 * 任何 `import '@/utils/logger'`（业务代码、store、命令层……）都会顺带把落盘装好，
 * 于是：
 * - 没有人能忘了装（不会"日志不落盘"）；
 * - 没有人能抢在前面装一个自己的（装配不是 API，无从参与）；
 * - 装配早于任何业务代码运行 ⇒ 不存在"还没装上"的窗口。
 *
 * 落盘实现（`cep/log-file.ts`）**不 import logger** ⇒ 它与本模块之间只有这一条
 * 单向依赖边；链上其余的环（`cep/fs` → `cep/transport` → 本模块）因为**环上没有任何模块
 * 在顶层立刻调用对方**而不炸（实测过：顶层一调就是 TDZ `Cannot access 'log' before initialization`）。
 *
 * `load()` 失败也算落盘失败：读不到上次历史 = "关掉重开查不到"，同样是观测缺口，必须喊出来。
 */
function installDiskSink(next: DiskLogSink): void {
  sink = next
  try {
    const lines = next.load()
    history.length = 0
    history.push(...lines)
  } catch (e) {
    noteSinkFailure(e instanceof Error ? e.message : String(e))
  }
}

// 装上（模块求值时；落盘失败由上面的 catch 记成一条 warn，不抛给任何调用方）
installDiskSink(
  createLogFileSink((reason) => {
    // 落盘口自己写失败 → 记一条 warn（**由 logger 自己的函数处理**，不是落盘实现回调 logger
    // —— 那样会成环）。注意：此刻 sink 可能还没装好/已坏，所以只进内存缓冲 + 控制台。
    noteSinkFailure(reason)
  }),
)

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
}

// 方便在 CEP 的 devtools 里直接敲 __pszDump()（类型在 src/env.d.ts 的 Window）
// 它是 `log.dump()` 的**别名**（外部读日志的第二条路，不是第二份实现）：
// 外部（DevTools / 宿主脚本）用 `window.__pszDump()`，内部一律 `log.dump()`。
window.__pszDump = () => log.dump()
