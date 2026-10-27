// 是什么：云同步的唯一装配点——engine 的端口注入 + 后台同步队列（ADR-21）
// 唯一入口：engine 与队列都只在这里建；别处 import 实例，不要自己 new
// 替代了什么：change-sync.ts 的 3 秒防抖队列已删除，engine 与队列现都由本文件装配
// 谁在用：cep/cloud/change-sync.ts（订阅 repo）、cloud/auto-sync.ts（启动/可见性）、stores/cloud
// 禁止：这里不做业务判断（冲突、重试都归 engine 与队列）；页面/组件不许 import

import { createSyncQueue } from '@/cloud/change-sync'
import type { SyncIntent, SyncOutcome } from '@/cloud/change-sync'
import { CLOUD_SYNC_BACKOFF_MS } from '@/config/cloud'
import { createCloudEngine, type CloudEngine } from '@/cloud/engine'
import { log } from '@/utils/logger'
import { cloudEntries } from './entries'
import { isAutoSyncEnabled, isCloudUrlUsable } from './config'
import { readCloudLedger, writeCloudLedger } from './ledger'
import { clearPendingChanges, readPendingChanges, recordPendingChanges } from './pending'
import { reportSyncError, reportSyncOutcome } from './sync-report'
import { pullSnapshot, pushSnapshot } from './transport'

/** 端口注入：具体 CEP 实现只在这里给；对外的 `cloudEngine` 是下面的串行门面 */
const engine = createCloudEngine({
  config: {
    // 端口名由 engine 定（`isConfigured`）；实现叫 `isCloudUrlUsable` 才是它真正判的事
    isConfigured: isCloudUrlUsable,
    isAutoSyncEnabled,
  },
  transport: {
    push: pushSnapshot,
    pull: pullSnapshot,
  },
  ledger: {
    read: readCloudLedger,
    write: writeCloudLedger,
  },
  pending: {
    record: recordPendingChanges,
    list: readPendingChanges,
    clear: clearPendingChanges,
  },
  entries: cloudEntries,
})

/** 全部同步项 id：sweep（启动补偿 / 变可见）推的就是这一份 */
export function allSyncUnitIds(): string[] {
  return cloudEntries.map((entry) => entry.id)
}

/**
 * 后台同步的闸门（T-114 起是 async：台账读取要区分"没有"与"读不到"）。
 *
 * 五个"不发请求就返回"的理由要分开，因为用户该做的事完全不同（T-74 要靠它出文案）：
 * - 未配置 / 自动同步关：用户去设置页；
 * - 没有台账：新设备先手动下载（`hasCloudLedger` 是"新设备不覆盖云端"的护栏，
 *   见 `docs/架构/云同步底层设施.md`「我们多两条约束」）；
 * - **台账读不到**：既不能当"没有"（会解除那条护栏），也不能当"有"（没有依据判冲突）；
 * - 离线：等网络，退避会自己重试。
 *
 * 返回 `status: 'skipped'` 是**有意**的：脏集合要留着，退避到点再试；返回 `ok` 会把"还没同步出去"清掉。
 */
async function gate(): Promise<SyncOutcome | null> {
  // 这一臂一次请求都没发 ⇒ 不消耗退避额度（退避是留给真网络错误的）
  // 跳过不需要"原因"：`fail` 本身就是原因。再传一句同样的话等于同一个值写两遍。
  const skip = (fail: string): SyncOutcome => ({
    status: 'skipped',
    failure: { fail },
  })

  if (!isCloudUrlUsable()) return skip('CLOUD_NOT_CONFIGURED')
  if (!isAutoSyncEnabled()) return skip('CLOUD_AUTO_SYNC_OFF')
  const read = await readCloudLedger()
  if (read.status === 'error') return skip('CLOUD_LEDGER_BROKEN')
  if (read.status === 'notSeen') return skip('CLOUD_NO_LEDGER')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return skip('CLOUD_OFFLINE')
  }
  return null
}

/**
 * 错误码 → 重试策略。**只有"重试方式不同"的码才进这张表**：
 * - 权限（401/403/登录页）：自己不会好 → 停手，等下一次触发点；
 * - 限流（429）：会好但要慢 → 直接按最长一档退避。
 * 其余失败（网络 / 超时 / 5xx / 写盘失败）走常规梯度，不进表——进了也是同一个值。
 */
function retryPolicy(errorCode: string | undefined): { retry?: boolean; retryAfterMs?: number } {
  if (errorCode === 'CLOUD_PERMISSION') return { retry: false }
  if (errorCode === 'CLOUD_RATE_LIMITED') {
    return { retryAfterMs: CLOUD_SYNC_BACKOFF_MS[CLOUD_SYNC_BACKOFF_MS.length - 1] }
  }
  return {}
}

/**
 * 离线 sweep 的留痕是否已经写过。
 *
 * 日志记**跃迁**不记心跳：离线持续一小时会按最大等待慢轮询十几轮
 * 每轮都 warn 一遍同样的字，等于把 warn 降级成心跳。闸门放行时清零，下次离线重新留一句。
 */
let offlineSweepWarned = false

/**
 * 闸门挡下时的痕迹。
 *
 * **离线不算失败**（ADR-21：闸门返回 skip，不消耗退避），但它必须可观测：
 * 否则"离线期间本地改了没上去"与"全部已同步"在界面与日志里逐字相同。
 * 只给离线留 pending：其它四个理由（未配置 / 自动同步关 / 无台账 / 坏台账）
 * 用户能在设置页直接看到状态，写 5 条"待同步"只会让痕迹变得没用。
 *
 * sweep **不记 pending**：那时确实没有"哪一项被卡住"可指，塞进去会把「待推送 N 项」
 * 从"哪一项推失败了"变成噪音。但**必须留一句 warn**——上一版按
 * `units.length === 0` 早退，于是"离线 + 本轮是 sweep"既不记 pending 也不留日志，
 * 用户与开发者都无痕。sweep 与否看队列传下来的 `intent`
 * 不看 `units` 长短：空数组是 sweep 的结果，不是判据。
 */
function markSkipped(outcome: SyncOutcome, units: string[], intent: SyncIntent): void {
  if (outcome.status !== 'skipped' || outcome.failure.fail !== 'CLOUD_OFFLINE') return
  if (intent === 'sweep') {
    if (offlineSweepWarned) return
    offlineSweepWarned = true
    log.warn(
      'cloud',
      '离线，本轮全量补偿同步没有执行：所有项都没推上去（sweep 没有具体项，未记入待同步；联网后按最大等待自动重试）',
    )
    return
  }
  recordPendingChanges(units, 'network', 'CLOUD_OFFLINE')
}

/**
 * 后台同步的唯一队列（ADR-21）：触发点只 `markDirty`，请求只从这里发。
 * 手动整包（upload/download）走 `cloudSyncQueue.runSerial`，与自动推送共用一条串行链。
 */
export const cloudSyncQueue = createSyncQueue({
  async sync(units, intent) {
    const blocked = await gate()
    if (blocked) {
      markSkipped(blocked, units, intent)
      return blocked
    }
    // 闸门放行 = 上一轮"离线 sweep 无痕"那句话作废，下次离线要重新留一句
    offlineSweepWarned = false
    // 全量还是这一批，同样只看 `intent`：`units` 为空是 sweep 的结果，不是它的判据
    const result = await engine.pushUnits(intent === 'sweep' ? allSyncUnitIds() : units)
    // 重试策略只看失败码；`ok` 臂没有码
    const code = result.status === 'ok' ? undefined : result.failure.fail
    return { ...result, ...retryPolicy(code) }
  },
  // 结局与异常都必须有接收者：以前这两个钩子全空转，失败只剩 attempts++
  onOutcome: reportSyncOutcome,
  onError: reportSyncError,
})

/**
 * 对外只暴露这一个门面：手动整包（upload/download）与后台推送共用同一条串行链，
 * 所以"自动推送的 pull→push"和"手动上传的 pull→push"不会交错。
 *
 * 排队不插队：手动操作**不防抖、不进退避、不会被丢**，只是等当前那一轮临界区结束；
 * 反过来，手动整包跑着的时候，自动那一轮也会等它。
 * 页面/命令层据此不用改调用方式（仍 `cloudEngine.upload(...)`）。
 */
export const cloudEngine: CloudEngine = {
  getStatus: () => engine.getStatus(),
  pushUnits: (ids, options) => cloudSyncQueue.runSerial(() => engine.pushUnits(ids, options)),
  upload: (options) => cloudSyncQueue.runSerial(() => engine.upload(options)),
  download: (options) => cloudSyncQueue.runSerial(() => engine.download(options)),
}
