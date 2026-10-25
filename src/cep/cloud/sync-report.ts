// 是什么：后台同步的**结局 → 日志**唯一出口（成功 / 跳过 / 失败 / 抛错四条路都在这里落一句）
// 唯一入口：cep/cloud/setup.ts 建队列时把本文件接到 onOutcome / onError 上
// 替代了什么：以前队列的 outcome 根本没人接（`deps.onOutcome?.()` 空转），失败只剩 attempts++
// 谁在用：src/cep/cloud/setup.ts
// 禁止：这里不重试、不改状态、不弹提示——后台行为默认不打断用户（用户没按按钮就只记不弹）

import { log } from '@/utils/logger'
import type { SyncOutcome } from '@/cloud/change-sync'

/**
 * 上一轮的结局签名。
 *
 * **判据：日志记「跃迁」，不记心跳。**
 * - 成功：不逐条记。后台每 60s~5min 一轮，成功也写 info 会把 error 淹没——而 error 才是用户报障要的。
 *   但"从失败恢复"必须留一句：否则日志里最后一条永远是失败，事后看起来像一直坏着。
 * - 失败：**每次都记 warn**。退避已经把频率压到最长 15 分钟一次，少记一条就是少一份证据。
 * - 跳过（闸门没发请求）：只在原因变化时记 info（离线持续一小时不值得写 60 行同样的字）。
 */
let lastSignature = ''

/**
 * 结局变化的订阅者。
 *
 * 为什么需要它：痕迹写在盘上，而设置页只在挂载/手动拉取后读一次盘、5 秒定时器只刷内存脏数——
 * 后台推送失败期间页面开着，"没同步成功"那句永远不出现，关掉重开才有。
 *
 * 只在**跃迁**时通知（与日志同一条判据：记跃迁不记心跳）：
 * 每次成功都去读一遍台账文件没有意义，而"上一次不是成功"这一刻正是页面需要更新的时刻。
 */
export type SyncReportListener = (signature: string) => void
const listeners = new Set<SyncReportListener>()

/** 订阅结局变化；返回取消函数。装配层（main.ts 经 bindCloudData）接一次 */
export function onSyncOutcomeReported(listener: SyncReportListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(signature: string): void {
  for (const listener of listeners) {
    try {
      listener(signature)
    } catch (e) {
      // 订阅者坏了不许影响同步本体：这条已经写进日志了，同步结果不受它影响
      log.warn('cloud', '同步结局的订阅者抛错（同步本身不受影响）', e)
    }
  }
}

function signatureOf(outcome: SyncOutcome): string {
  if (outcome.ok) return 'ok'
  if (outcome.skip) return `skip:${outcome.errorCode ?? 'unknown'}`
  return `fail:${outcome.errorCode ?? 'unknown'}`
}

/** 失败那句里的原因：错误码是"哪一类"，error 是"PS/网关自己说了什么"，两个都要 */
function reasonOf(outcome: SyncOutcome): string {
  const code = outcome.errorCode ?? '未知错误码'
  return outcome.error ? `${code} · ${outcome.error}` : code
}

export function reportSyncOutcome(outcome: SyncOutcome, units: string[]): void {
  const signature = signatureOf(outcome)
  const scope = { units: units.length, errorCode: outcome.errorCode }
  const changed = lastSignature !== signature

  if (outcome.ok) {
    if (lastSignature && changed) {
      log.info('cloud', `云同步恢复正常（上一次：${lastSignature}）`, scope)
    }
    lastSignature = 'ok'
    if (changed) notify(signature)
    return
  }

  if (outcome.skip) {
    if (changed) {
      log.info('cloud', `后台同步本轮跳过：${reasonOf(outcome)}（没发请求，不消耗退避）`, scope)
      notify(signature)
    }
    lastSignature = signature
    return
  }

  log.warn('cloud', `后台同步未完成：${reasonOf(outcome)}`, scope)
  lastSignature = signature
  if (changed) notify(signature)
}

/**
 * 队列的 catch 分支（`sync()` 自己抛了，没走到 outcome）。
 *
 * 这是引擎里少数"自己没包住"的抛错路径的唯一出口：不接这个钩子，
 * 它就只剩一个 `attempts++`——用户看到"上次同步时间不动"，其余全绿。
 */
export function reportSyncError(error: unknown): void {
  log.error('cloud', '后台同步抛错（没有返回结局）', error)
  const changed = lastSignature !== 'error'
  lastSignature = 'error'
  if (changed) notify('error')
}

/** 仅测试用：清掉"上一轮结局"的记忆 */
export function __resetSyncReportForTest(): void {
  lastSignature = ''
}
