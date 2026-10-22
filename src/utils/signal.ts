/**
 * 极简信号：跨层通知"该重新读一次了"，不携带数据。
 *
 * 为什么不用 store：这是**命令 → 视图**的单向通知。
 * 命令不能依赖 store（ADR-16），视图订阅信号后自己刷新。
 */
export interface Signal {
  emit(): void
  on(listener: () => void): () => void
}

export function createSignal(): Signal {
  const listeners = new Set<() => void>()
  return {
    emit() {
      for (const listener of listeners) listener()
    },
    on(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** 字体列表该重读了（`font.refreshList` 命令发） */
export const fontListRefresh = createSignal()
