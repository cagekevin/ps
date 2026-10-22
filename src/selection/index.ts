import { shallowRef } from 'vue'
import { subscribeHostEvent } from '@/cep/events'
import { getLayerState, initJsx } from '@/cep/ps'
import { log } from '@/utils/logger'

/**
 * 当前选区快照。
 *
 * `slct` 事件 → refresh；事件不可用时仍由命令执行前查询兜底。
 * 事件 ID 与回调格式来自原版 `app.v4.js:69399-69407`。
 */
export interface SelectionSnapshot {
  hasSelection: boolean
  /** 原版 `Layer_getTypeNumber`：2 = 文字图层（UNVERIFIED：未在真机确认） */
  typeNumber: number
}

const EMPTY: SelectionSnapshot = { hasSelection: false, typeNumber: 0 }

/** 响应式快照：`useCommand.disabled` 直接读它，不需要额外订阅 */
export const selectionRef = shallowRef<SelectionSnapshot>(EMPTY)

let inflight: Promise<SelectionSnapshot> | null = null

/** 向 PS 查一次；并发调用复用同一个请求 */
export function refresh(): Promise<SelectionSnapshot> {
  if (inflight) return inflight

  inflight = getLayerState()
    .then((state) => {
      const next = { hasSelection: state.hasSelection, typeNumber: state.typeNumber }
      selectionRef.value = next
      return next
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function current(): SelectionSnapshot {
  return selectionRef.value
}

/** 仅测试用：模拟选区变化。生产调用链里不出现 */
export function __pushForTest(snapshot: SelectionSnapshot) {
  selectionRef.value = snapshot
}

let stopWatch: (() => void) | null = null

/**
 * 启动选区事件订阅（幂等）。
 *
 * 机制：`slct` 十进制 ID 注册 → 回调 → refresh。
 * 不可用时返回 no-op，保持“执行前查询”的降级形态。
 */
export async function startSelectionWatch(): Promise<() => void> {
  if (stopWatch) return stopWatch

  try {
    await initJsx()
    // 首次查询失败（没有文档/选区）不影响事件订阅，后续选区变化仍要刷新
    try {
      await refresh()
    } catch (e) {
      log.warn('selection', '首次选区查询失败', e)
    }
    stopWatch = await subscribeHostEvent('selection', () => {
      void refresh()
    })
  } catch (e) {
    log.warn('selection', '选区事件不可用，退回执行前查询', e)
    stopWatch = () => {}
  }

  return stopWatch
}
