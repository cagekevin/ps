import type { ProgressHandle, ProgressPort } from './types'

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
