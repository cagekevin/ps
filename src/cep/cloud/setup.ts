// 是什么：云同步的唯一装配点——engine 的端口注入 + 后台同步队列（ADR-21）
// 唯一入口：engine 与队列都只在这里建；别处 import 实例，不要自己 new
// 替代了什么：原来只有 engine（队列原先散在 cep/cloud/change-sync.ts 的 3 秒防抖里）
// 谁在用：cep/cloud/change-sync.ts（订阅 repo）、cloud/auto-sync.ts（启动/可见性）、stores/cloud
// 禁止：这里不做业务判断（冲突、重试都归 engine 与队列）；页面/组件不许 import

import { createSyncQueue } from '@/cloud/change-sync'
import type { SyncOutcome } from '@/cloud/change-sync'
import { createCloudEngine, type CloudEngine } from '@/cloud/engine'
import { cloudEntries } from './entries'
import { isAutoSyncEnabled, isCloudConfigured } from './config'
import { hasCloudLedger, readCloudLedger, writeCloudLedger } from './ledger'
import { clearPendingChanges, readPendingChanges, recordPendingChanges } from './pending'
import { pullSnapshot, pushSnapshot } from './transport'

/** 端口注入：具体 CEP 实现只在这里给；对外的 `cloudEngine` 是下面的串行门面 */
const engine = createCloudEngine({
  config: {
    isConfigured: isCloudConfigured,
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
 * 后台同步的闸门。
 *
 * 四个"不发请求就返回"的理由要分开，因为用户该做的事完全不同（T-74 要靠它出文案）：
 * - 未配置 / 自动同步关：用户去设置页；
 * - 没有台账：新设备先手动下载（`hasCloudLedger` 是"新设备不覆盖云端"的护栏，
 *   见 `docs/架构/云同步底层设施.md`「我们多两条约束」）；
 * - 离线：等网络，退避会自己重试。
 *
 * 返回 ok:false 是**有意**的：脏集合要留着，退避到点再试；返回 ok:true 会把"还没同步出去"清掉。
 */
function gate(): SyncOutcome | null {
  // `skip: true`：这类原因一次请求都没发，不该吃掉退避额度（退避是留给真网络错误的）
  if (!isCloudConfigured()) return { ok: false, skip: true, errorCode: 'CLOUD_NOT_CONFIGURED' }
  if (!isAutoSyncEnabled()) return { ok: false, skip: true, errorCode: 'CLOUD_AUTO_SYNC_OFF' }
  if (!hasCloudLedger()) return { ok: false, skip: true, errorCode: 'CLOUD_NO_LEDGER' }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, skip: true, errorCode: 'CLOUD_OFFLINE' }
  }
  return null
}

/**
 * 后台同步的唯一队列（ADR-21）：触发点只 `markDirty`，请求只从这里发。
 * 手动整包（upload/download）走 `cloudSyncQueue.runSerial`，与自动推送共用一条串行链。
 */
export const cloudSyncQueue = createSyncQueue({
  async sync(units) {
    const blocked = gate()
    if (blocked) return blocked
    return engine.pushUnits(units.length > 0 ? units : allSyncUnitIds())
  },
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
