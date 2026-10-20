/**
 * 统一日志。CEP 里没法刷新页面，出问题只能靠控制台和这份内存缓冲。
 * 保留最近 200 条，用户反馈问题时可以让他在控制台执行 __pszDump() 贴出来。
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

function stamp(): string {
  const d = new Date()
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

function record(level: Level, scope: string, message: string, detail?: unknown) {
  buffer.push({ time: stamp(), level, scope, message, detail })
  if (buffer.length > MAX_ENTRIES) buffer.shift()

  const line = `[psz][${scope}] ${message}`
  if (level === 'error') console.error(line, detail ?? '')
  else if (level === 'warn') console.warn(line, detail ?? '')
  else console.log(line, detail ?? '')
}

export const log = {
  debug: (scope: string, message: string, detail?: unknown) => record('debug', scope, message, detail),
  info: (scope: string, message: string, detail?: unknown) => record('info', scope, message, detail),
  warn: (scope: string, message: string, detail?: unknown) => record('warn', scope, message, detail),
  error: (scope: string, message: string, detail?: unknown) => record('error', scope, message, detail),
  dump(): string {
    return buffer.map((e) => `${e.time} ${e.level.toUpperCase()} [${e.scope}] ${e.message}`).join('\n')
  },
  clear() {
    buffer.length = 0
  },
}

// 方便在 CEP 的 devtools 里直接敲 __pszDump()
;(window as unknown as { __pszDump?: () => string }).__pszDump = () => log.dump()
