// 是什么：后台推送被跳过/失败时留下的"待同步"痕迹（T-55/T-56）
// 唯一入口：只有 cloud engine 经 CloudPendingPort 写；外部只读 getStatus().pending
// 替代了什么：没有替代物——原版是用户在前台点同步，"后台改了没上去"这一格原版不存在
// 谁在用：cep/cloud/setup.ts 注入 engine；stores/cloud 经 getStatus() 拿到数量
// 禁止：这里不发请求、不弹提示（提示归 UI 层）；也不要用 console 顶替记录

import { getPref, setPref } from '@/cep/data/settings'
import { msg } from '@/domain/messages'
import type { PendingChange, PendingReason } from '@/cloud/types'
import { log } from '@/utils/logger'

const KEY = 'cloud.pending'
/** 上限：只保留最近 32 条，避免长期离线把偏好文件撑大 */
const MAX = 32

function read(): PendingChange[] {
  const value = getPref<unknown>(KEY, [])
  if (!Array.isArray(value)) return []
  const out: PendingChange[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Record<string, unknown>
    if (typeof raw.unit !== 'string' || !raw.unit) continue
    const reason: PendingReason =
      typeof raw.reason === 'string' ? (raw.reason as PendingReason) : 'network'
    const code = typeof raw.code === 'string' && raw.code ? raw.code : undefined
    out.push({ unit: raw.unit, at: Number(raw.at) || 0, reason, ...(code ? { code } : {}) })
  }
  return out
}

/**
 * 错误码 → 日志里那句"用户该做什么"。
 *
 * 只给**动作不同**的码写：权限错不会自己好，不写清就等于让人干等重试
 * （页面文案的分支属 TD-11-9/11-12 的页面轮次，这里先把原因留在日志里）。
 */
const CODE_HINT: Record<string, string> = {
  CLOUD_PERMISSION: '；这是权限问题，不会自己好——请检查 GAS 部署权限，本项不会自动重试',
  CLOUD_RATE_LIMITED: '；网关限流，会按最长间隔重试',
  CLOUD_OFFLINE: '；当前离线，联网后会自动重试',
}

/** 进程内只警告一次：同一条原因反复刷屏没有信息量，痕迹本身靠记录 */
let warned = false

export function recordPendingChanges(units: string[], reason: PendingReason, code?: string): void {
  if (units.length === 0) return
  const at = Date.now()
  const merged = new Map(read().map((item) => [item.unit, item]))
  for (const unit of units) merged.set(unit, { unit, at, reason, ...(code ? { code } : {}) })
  const next = [...merged.values()].sort((a, b) => a.at - b.at).slice(-MAX)
  setPref(KEY, next)

  if (!warned) {
    warned = true
    log.warn(
      'cloud',
      msg.cloud.fn.syncIncomplete(reason, code ? ` · ${code}` : '', units.join('、')) +
        `${CODE_HINT[code ?? ''] ?? ''}`,
    )
  }
}

export function readPendingChanges(): PendingChange[] {
  return read()
}

/** 不传 = 全清（整包上传 / 下载成功后所有 unit 都已对齐） */
export function clearPendingChanges(units?: string[]): void {
  if (units === undefined) {
    if (read().length === 0) return
    setPref(KEY, [])
    return
  }
  const drop = new Set(units)
  const next = read().filter((item) => !drop.has(item.unit))
  setPref(KEY, next)
}

/** 仅供测试：重置"只警告一次"的进程内标记 */
export function __resetPendingWarnForTest(): void {
  warned = false
}
