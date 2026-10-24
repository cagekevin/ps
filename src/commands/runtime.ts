import type { ProgressHandle, ProgressPort } from './types'

/**
 * 缺字体提示的端口（TD-12-20）。
 *
 * 命令发现字体缺失时只需要"说一声"，怎么显示归 UI：实现是 `stores/font-missing`，
 * 由 `main.ts` 装配。**命令层不许直接 import store**（ADR-16），所以走这一层。
 */
export interface MissingFontPort {
  signal(name: string): void
}

const NOOP_MISSING_FONT: MissingFontPort = { signal: () => {} }

let missingPort: MissingFontPort = NOOP_MISSING_FONT

export function setMissingFontPort(next: MissingFontPort) {
  missingPort = next
}

export function missingFontPort(): MissingFontPort {
  return missingPort
}

/** 仅测试用：恢复默认端口 */
export function resetMissingFontPort() {
  missingPort = NOOP_MISSING_FONT
}

/**
 * 命令层的运行时端口。
 *
 * 为什么需要注入而不是直接 import store：`commands/**` 禁止依赖 `stores/**`（ADR-16 护栏）。
 * 长任务状态的实现在 `stores/tasks`，由 `main.ts` 装配时注入。
 * 测试里可以注入 fake，不启 UI。
 */
const NOOP_HANDLE: ProgressHandle = {
  update: () => {},
  end: () => {},
}

const NOOP_PORT: ProgressPort = {
  begin: () => NOOP_HANDLE,
}

let port: ProgressPort = NOOP_PORT

export function setProgressPort(next: ProgressPort) {
  port = next
}

export function progressPort(): ProgressPort {
  return port
}

export function noopProgressHandle(): ProgressHandle {
  return NOOP_HANDLE
}

/** 仅测试用：恢复默认端口 */
export function resetProgressPort() {
  port = NOOP_PORT
}
