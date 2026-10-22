// 是什么：本地改动 → 按 unit 推送的 3 秒防抖器（纯逻辑，不认识 CEP / repo / store）
// 唯一入口：T-55/T-56 的"变更触发推送"只能经过 createChangeSync；装配见 cep/cloud/change-sync.ts
// 替代了什么：原版 56d7.js:48341-48351 emit → :8998 监听 → :9562 3 秒防抖 → :9596 $sync.pushFile
// 谁在用：cep/cloud/change-sync.ts
// 禁止：这里不发请求、不读数据文件；push 由调用方注入，便于单测换成假实现

import type { PushUnitsResult } from './types'

/** 原版 3 秒防抖（`56d7.js:9562`）；依据是二手证据，见 docs/生成/jsx返回结构复原.md §3.3 */
export const CHANGE_SYNC_DELAY_MS = 3000

export interface ChangeSyncDeps {
  push: (units: string[]) => Promise<PushUnitsResult>
  delayMs?: number
  onResult?: (result: PushUnitsResult) => void
  onError?: (error: unknown) => void
}

export interface ChangeSync {
  /** 记一笔"这个 unit 改过了"，重置 3 秒计时 */
  notify(unit: string): void
  /** 立即推送（手动 flush / 关面板前）；没有排队就什么都不做 */
  flush(): Promise<void>
  /** 还没推送出去的 unit（用于状态投影与测试） */
  pending(): string[]
  stop(): void
}

/**
 * 合并 + 串行：
 * - 连续改动只推一次（同一个 unit 反复 notify 会去重）；
 * - 上一次 push 没回来时不会开第二轮，避免同一条链路并发 push。
 */
export function createChangeSync(deps: ChangeSyncDeps): ChangeSync {
  const delayMs = deps.delayMs ?? CHANGE_SYNC_DELAY_MS
  const queued = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let chain: Promise<void> = Promise.resolve()

  function schedule(): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, delayMs)
  }

  function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (queued.size === 0) return chain

    const units = [...queued].sort()
    queued.clear()
    chain = chain.then(async () => {
      try {
        // 不能写成 `deps.onResult?.(await deps.push(units))`：可选调用在 onResult
        // 为 undefined 时会连实参一起跳过，push 根本不会执行（已踩过）。
        const result = await deps.push(units)
        deps.onResult?.(result)
      } catch (error) {
        deps.onError?.(error)
      }
    })
    return chain
  }

  return {
    notify(unit) {
      if (!unit) return
      queued.add(unit)
      schedule()
    },
    flush,
    pending: () => [...queued].sort(),
    stop() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      queued.clear()
    },
  }
}
