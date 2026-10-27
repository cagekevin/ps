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

/**
 * 事件订阅的健康状态。
 *
 * `degraded` 不是「降级完成」，是「降级了、而且这件事有人知道」：按钮可用性会停在
 * 上一次查询的结果，只有命令执行前的查询还在兜。页面对着它显示提示条是下一轮的事，
 * 这里先保证状态和日志存在——以前是 `stopWatch = () => {}`，失败了也长得像成功。
 */
/**
 * 选区订阅的状态机：没试过 / 订阅中 / 订阅失败。
 *
 * `error` 是**失败臂**（不是"可用但不完整"）：订阅没建成时按钮会停在旧快照，
 * 只靠执行前查询兜底。所以它带 `detail`（技术原文，进日志）与 `failedAt`（多久前失败）。
 */
export type SelectionWatchState =
  | { status: 'idle' }
  | { status: 'watching' }
  | { status: 'error'; detail: string; failedAt: number }

export const watchStateRef = shallowRef<SelectionWatchState>({ status: 'idle' })

let inflight: Promise<SelectionSnapshot> | null = null

/** 向 PS 查一次；并发调用复用同一个请求 */
export function refresh(): Promise<SelectionSnapshot> {
  if (inflight) return inflight

  inflight = getLayerState()
    .then((state) => {
      const next = { hasSelection: state.hasSelection, typeNumber: state.typeNumber }
      selectionRef.value = next
      retryWatchIfDegraded()
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
let watchInFlight: Promise<() => void> | null = null
let lastAttemptAt = 0

/** 订阅失败后的重试间隔：太密等于每条命令都去注册一次事件 */
const RETRY_MS = 10_000

/**
 * PS 回话了 ⇒ 上一次订阅失败可以再试一次。
 *
 * 触发点选「有人来查选区」（命令执行前 / 页面刷新）而不是 `setInterval`：
 * 面板不空转定时器，用户一动手就有第二次机会，且重试频率天然跟着真实使用走。
 */
function retryWatchIfDegraded(): void {
  if (stopWatch || watchStateRef.value.status !== 'error') return
  if (Date.now() - lastAttemptAt < RETRY_MS) return
  void startSelectionWatch()
}

/**
 * 启动选区事件订阅（幂等）。
 *
 * 机制：`slct` 十进制 ID 注册 → 回调 → refresh。
 * 订阅失败**不缓存空订阅**（以前缓存了，等于「这个会话再也不会重试」）：
 * 状态置 `degraded`、原因进日志，下次查询成功且过了重试间隔时自动再试。
 */
export function startSelectionWatch(): Promise<() => void> {
  if (stopWatch) return Promise.resolve(stopWatch)
  if (watchInFlight) return watchInFlight

  watchInFlight = doStartWatch().finally(() => {
    watchInFlight = null
  })
  return watchInFlight
}

async function doStartWatch(): Promise<() => void> {
  lastAttemptAt = Date.now()

  try {
    await initJsx()
    // 首次查询失败（没有文档/选区）不影响事件订阅，后续选区变化仍要刷新
    try {
      await refresh()
    } catch (e) {
      log.warn('selection', '首次选区查询失败', e)
    }
    stopWatch = await subscribeHostEvent('selection', () => {
      // 事件触发的查询失败必须落日志：`void` 掉一个会 reject 的 Promise 是
      // unhandledrejection，只在 devtools 里一闪而过，用户和日志都看不到
      void refresh().catch((e) => log.warn('selection', '选区事件触发的查询失败', e))
    })
    watchStateRef.value = { status: 'watching' }
    return stopWatch
  } catch (e) {
    watchStateRef.value = {
      status: 'error',
      detail: e instanceof Error ? e.message : String(e),
      failedAt: Date.now(),
    }
    log.error(
      'selection',
      `选区事件订阅失败，按钮会停在旧快照（只靠执行前查询兜底），${RETRY_MS / 1000}s 后随下一次查询重试`,
      e,
    )
    return () => {}
  }
}

/** 仅测试用：把订阅状态清回「没试过」 */
export function __resetWatchForTest(): void {
  stopWatch = null
  watchInFlight = null
  lastAttemptAt = 0
  watchStateRef.value = { status: 'idle' }
}
