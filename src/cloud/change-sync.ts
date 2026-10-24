// 是什么：所有"要同步"的信号 → 网络的唯一队列：标脏 / 60s 防抖 / 5min 最大等待 / 退避 / 串行（ADR-21）
// 唯一入口：触发点只能调 markDirty / requestSync / flushDirty；请求只由本队列发，手动整包走 runSerial
// 替代了什么：原 `createChangeSync` 的 3 秒防抖（整包通道下不可用）+ 2 小时自链定时器（同步不再由时间驱动）
// 谁在用：cep/cloud/setup.ts（建实例）、cep/cloud/change-sync.ts（订阅 repo）、cloud/auto-sync.ts（启动/可见性）
// 禁止：页面/组件不许 import；这里不发请求、不认识 CEP/repo/store——sync 由调用方注入，便于单测换成假实现

import {
  CLOUD_SYNC_BACKOFF_MS,
  CLOUD_SYNC_DEBOUNCE_MS,
  CLOUD_SYNC_MAX_WAIT_MS,
} from '@/config/cloud'

/** 一次同步的结果；只关心"成没成"，细节由调用方在自己的 onOutcome 里处理 */
export interface SyncOutcome {
  ok: boolean
  cancelled?: boolean
  errorCode?: string
  /** 具体原因原文（引擎/闸门给的），日志里必须带得上——只有码等于只说"失败了" */
  error?: string
  /**
   * 根本没发请求（自动同步关 / 没有台账 / 离线 / 未配置）。
   *
   * 与"失败"必须分开：这类原因退避 15 分钟毫无意义——用户点一下开关就好了，
   * 而且退避额度是给真网络错误用的，被闸门吃掉之后会把"网络恢复"也拖到 15 分钟。
   */
  skip?: boolean
  /**
   * 失败后要不要**自己**再排一轮（默认 true）。
   *
   * 权限错（401/403）不会自己好：按退避重试只是每 15 分钟往日志里写一遍同样的错，
   * 用户永远等不到成功。这类失败置 false = 停手，等下一次触发点（新的改动 / 手动 / 变可见）。
   * 判据见 TD-11-8：每个新错误码要么改重试策略、要么改用户该做什么，否则不该分。
   */
  retry?: boolean
  /** 下次重试至少等这么久（服务端明确要求"慢点"时用）；与退避梯度取大 */
  retryAfterMs?: number
}

export interface SyncQueueDeps {
  /** 真正干活的一次同步；`units` 为空数组表示"全量 sweep"（启动 / 变可见） */
  sync: (units: string[]) => Promise<SyncOutcome>
  debounceMs?: number
  maxWaitMs?: number
  backoffMs?: readonly number[]
  onOutcome?: (outcome: SyncOutcome, units: string[]) => void
  onError?: (error: unknown) => void
}

export interface SyncQueue {
  /** 记一笔"这个 unit 改过了"；**不发请求**，只重置静默期 */
  markDirty(unit: string): void
  /** 立即排一次同步，无论有没有脏（sweep：启动补偿 / 变可见） */
  requestSync(reason: string): void
  /** 有脏就立刻推，没脏什么都不做（变隐藏：页面随时可能被销毁） */
  flushDirty(reason: string): void
  /** 手动整包操作（upload/download）：串行执行，不防抖、不退避、不丢 */
  runSerial<T>(task: () => Promise<T>): Promise<T>
  /** 还没推送出去的 unit（状态投影与测试用） */
  pendingUnits(): string[]
  busy(): boolean
  attempts(): number
  stop(): void
}

/**
 * 队列要同时满足四件互相拉扯的事，缺一个都会出事：
 *
 * - **防抖**：连续改动只推一次（整包上传，推太密会打爆 GAS 与云端 JSON）；
 * - **最大等待**：手一直没停时也必须到点推一次，否则防抖等于"永不推送"；
 * - **退避**：失败后按 1→2→5→15 分钟重试，不要每轮硬撞同一个错误；
 * - **串行**：一次同步的 pull→push 全程是临界区，第二轮必须等第一轮回来。
 *
 * 定时器只在"有脏"和"退避中"存在；同步成功后队列完全静止（空闲=silent），
 * 下一次靠触发点叫醒——这是 ADR-21 去掉定时器后的正常状态。
 */
export function createSyncQueue(deps: SyncQueueDeps): SyncQueue {
  const debounceMs = deps.debounceMs ?? CLOUD_SYNC_DEBOUNCE_MS
  const maxWaitMs = deps.maxWaitMs ?? CLOUD_SYNC_MAX_WAIT_MS
  const backoffMs = deps.backoffMs ?? CLOUD_SYNC_BACKOFF_MS

  const dirty = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  /** 本轮脏集合的起点，最大等待从这里算；清空后归零 */
  let firstDirtyAt = 0
  let attempts = 0
  /** 退避到期时间；0 = 不在退避中 */
  let retryAt = 0
  /** 本轮是被闸门挡下的（没发请求）：下一步按"慢轮询"排，不进退避 */
  let skipped = false
  /** 失败原因是"自己不会好"的（`retry:false`）：不再自己排重试，等下一次触发点 */
  let parked = false
  /** 一次同步在飞（pull→push 全程） */
  let running = false
  let stopped = false
  /** 所有网络任务（自动同步 + 手动整包）共用这一条链 */
  let chain: Promise<unknown> = Promise.resolve()

  function clearTimer(): void {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  function schedule(delayMs: number): void {
    if (stopped) return
    clearTimer()
    timer = setTimeout(
      () => {
        timer = null
        void execute()
      },
      Math.max(0, delayMs),
    )
  }

  /** 静默期与最大等待取小的那个：安静就 60s 后推，手不停就到点推 */
  function nextDelay(): number {
    if (!firstDirtyAt) return debounceMs
    const untilMaxWait = firstDirtyAt + maxWaitMs - Date.now()
    return Math.min(debounceMs, Math.max(0, untilMaxWait))
  }

  function serial<T>(task: () => Promise<T>): Promise<T> {
    const next = chain.then(task, task)
    // 链只用来排队，不让失败污染下一轮
    chain = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  function backoffDelay(): number {
    const index = Math.min(attempts, backoffMs.length) - 1
    return backoffMs[Math.max(0, index)]
  }

  async function execute(): Promise<void> {
    if (stopped || running) return
    running = true
    const units = [...dirty].sort()
    try {
      const outcome = await serial(() => deps.sync(units))
      if (outcome.ok) {
        attempts = 0
        retryAt = 0
        for (const unit of units) dirty.delete(unit)
        firstDirtyAt = dirty.size > 0 ? Date.now() : 0
      } else if (outcome.skip) {
        // 没发请求：脏留着，但不计失败、不进退避
        skipped = true
      } else if (outcome.retry === false) {
        // 重试改变不了结果（权限）：停手，但不丢脏集合——下一次触发点会再试一次
        attempts += 1
        parked = true
        retryAt = 0
      } else {
        attempts += 1
        retryAt = Date.now() + Math.max(backoffDelay(), outcome.retryAfterMs ?? 0)
      }
      deps.onOutcome?.(outcome, units)
    } catch (error) {
      attempts += 1
      retryAt = Date.now() + backoffDelay()
      deps.onError?.(error)
    } finally {
      running = false
      if (!stopped) {
        // 有脏：按"静默期 / 最大等待 / 退避到期"里最晚的那个再排一次；
        // 没脏但还在退避（sweep 失败）：到期重试，否则启动补偿失败一次就再也不试了。
        // 被闸门挡下则按最大等待做一次慢轮询——用户把自动同步打开后就自己恢复，不用等下一次改动。
        const delay = skipped ? maxWaitMs : Math.max(nextDelay(), retryAt - Date.now())
        if (!parked && (dirty.size > 0 || retryAt > Date.now())) schedule(delay)
      }
      skipped = false
    }
  }

  function trigger(onlyIfDirty: boolean): void {
    if (stopped) return
    if (onlyIfDirty && dirty.size === 0) return
    if (running) return // 在飞时不再开一轮；跑完的 finally 会按脏集合补排
    // 有人重新要同步了（手动 / 变可见 / 新的改动）⇒ 解除"停手"，再试一次
    parked = false
    clearTimer()
    void execute()
  }

  return {
    markDirty(unit) {
      if (stopped || !unit) return
      parked = false
      if (dirty.size === 0) firstDirtyAt = Date.now()
      dirty.add(unit)
      if (running) return // 跑完的 finally 会补排，避免两轮并发
      schedule(Math.max(nextDelay(), retryAt - Date.now()))
    },
    requestSync() {
      trigger(false)
    },
    flushDirty() {
      trigger(true)
    },
    runSerial(task) {
      return serial(task)
    },
    pendingUnits: () => [...dirty].sort(),
    busy: () => running,
    attempts: () => attempts,
    stop() {
      stopped = true
      clearTimer()
      dirty.clear()
      firstDirtyAt = 0
    },
  }
}
