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
  // debug / info 只在开发环境输出：面板的控制台是给用户看的，不该被日志刷屏
  // 这里是全项目唯一的 console 出口，业务代码只准调 log.*
  // eslint-disable-next-line no-console
  else if (import.meta.env.DEV) console.log(line, detail ?? '')
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
  dump(): string {
    return buffer
      .map((e) => {
        const head = `${e.time} ${e.level.toUpperCase()} [${e.scope}] ${e.message}`
        if (e.detail === undefined) return head
        try {
          // 事件回调的 data 可能很长，截断到 500 字符，够定位即可
          const text = JSON.stringify(e.detail)
          return `${head} ${text.length > 500 ? `${text.slice(0, 500)}…` : text}`
        } catch {
          return `${head} [detail 不可序列化]`
        }
      })
      .join('\n')
  },
  clear() {
    buffer.length = 0
  },
}

// 方便在 CEP 的 devtools 里直接敲 __pszDump()
;(window as unknown as { __pszDump?: () => string }).__pszDump = () => log.dump()
