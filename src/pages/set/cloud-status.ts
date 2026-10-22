// 是什么：设置页「云同步」区要显示的三样状态的措辞与格式（纯函数，零 IO、零 Vue）
// 唯一入口：云同步状态文案只在这里生成，页面不再拼字符串
// 替代了什么：原来"没同步上去"只到 log.warn + 一个没人读的数字（T-74）
// 谁在用：src/pages/set/index.vue、src/pages/set/components/CloudPullDialog.vue
// 禁止：这里不读 store、不发请求

import type { CloudStatus, PendingReason } from '@/cloud/types'

/** 本地时间 `YYYY-MM-DD HH:mm`；台账里是毫秒时间戳 */
function formatDateTime(ms: number): string {
  const date = new Date(ms)
  if (!Number.isFinite(ms) || ms <= 0 || Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * 「上次同步」。
 * `syncedAt` 只在**真的推上去/拉下来**时更新（T-76 特意让 skipped 不动它），
 * 所以 0 就是"从没同步过"，不能写成"很久以前"。
 */
export function formatSyncedAt(syncedAt: number): string {
  return formatDateTime(syncedAt) || '尚未同步'
}

/**
 * 失败原因 → 用户该做什么。
 *
 * 「未配置」和「冲突」必须分开：一个去填地址，一个决定保留哪边——
 * 混成一句"同步失败"等于没说（T-74 的验收条件）。
 */
const REASON_TEXT: Record<PendingReason, string> = {
  'not-configured': '没设置同步地址，没发出去',
  'no-cloud': '云端还没有数据',
  conflict: '云端和本地都改过',
  network: '网络失败，会在后台重试',
  'collect-failed': '本地这项数据读不出来，没上传',
}

export interface CloudStatusView {
  /** 上次同步（"尚未同步"） */
  syncedText: string
  /** 队列里等自动同步的条数 */
  queuedText: string
  /** 推失败过的（不含冲突）；空串表示不显示 */
  failedText: string
  /** 冲突；空串表示不显示 */
  conflictText: string
  /** 未配置 / 无台账 / 自动同步关 的解释；空串表示不显示 */
  notice: string
  failedCount: number
  conflictCount: number
}

export function describeCloudStatus(input: {
  status: CloudStatus
  /** 队列里还没到时间推的 unit 数（内存值） */
  queuedUnits: number
}): CloudStatusView {
  const { status, queuedUnits } = input

  const conflicts = status.pendingItems.filter((item) => item.reason === 'conflict')
  const failed = status.pendingItems.filter((item) => item.reason !== 'conflict')

  // 同一种原因只写一次，别把 5 个 unit 的同一句重复 5 遍
  const reasons = [...new Set(failed.map((item) => item.reason))]

  let notice = ''
  if (!status.configured) {
    notice = '没设置同步地址：云同步不会运行。'
  } else if (!status.hasLedger) {
    notice = '本地还没有同步记录。先点「从云端拉取」建立记录；新设备不会自动上传，避免覆盖云端。'
  } else if (!status.autoSyncEnabled) {
    notice = '自动同步已关闭：改动现在只存在本地，打开上面的开关才会推送。'
  }

  return {
    syncedText: formatSyncedAt(status.syncedAt),
    queuedText: queuedUnits === 0 ? '无' : `${queuedUnits} 项（等下一次自动同步）`,
    failedText:
      failed.length === 0
        ? ''
        : `${failed.length} 项：${reasons.map((reason) => REASON_TEXT[reason]).join('；')}`,
    conflictText:
      conflicts.length === 0
        ? ''
        : `${conflicts.length} 项 —— 云端和本地都改过，需要你决定保留哪边：` +
          '想保留云端就点「从云端拉取」（本地这些改动会被覆盖）。',
    notice,
    failedCount: failed.length,
    conflictCount: conflicts.length,
  }
}
