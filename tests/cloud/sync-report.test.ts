import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SyncOutcome } from '@/cloud/change-sync'

/**
 * logger 与被测模块必须拿到**同一个模块实例**的 `log`：
 * `vi.resetModules()` 之后，静态 import 的与动态 import 的不是同一份。
 * 所以这里两个都在 `beforeEach` 里动态 import（同一轮解析 ⇒ 同一实例）。
 */
let log: typeof import('@/utils/logger').log
let reportSyncError: typeof import('@/cep/cloud/sync-report').reportSyncError
let reportSyncOutcome: typeof import('@/cep/cloud/sync-report').reportSyncOutcome
let resetSyncReport: typeof import('@/cep/cloud/sync-report').__resetSyncReportForTest

/**
 * TD-11-6：后台同步的结局必须有接收者，并且**成功也要有痕迹——但只记跃迁**。
 *
 * 判据（本轮定的，写进阶段单）：
 * - 失败：每次都记 warn，带**码 + 原因原文**（只有"失败了"三个字等于没记）；
 * - 成功：默认不记（60s 一轮的 info 会把 error 淹没），只在"上一轮不是成功"时记一条恢复；
 * - 跳过：只在原因变化时记 info（离线一小时不值得写 60 行）；
 * - 抛错：error 级（这是引擎里少数没被自己包住的路径唯一的出口）。
 */

beforeEach(async () => {
  // 重载模块 = "面板重开" ⇒ logger 的内存缓冲是干净的（不再需要专门的清场函数）
  vi.resetModules()
  log = (await import('@/utils/logger')).log
  const report = await import('@/cep/cloud/sync-report')
  reportSyncError = report.reportSyncError
  reportSyncOutcome = report.reportSyncOutcome
  resetSyncReport = report.__resetSyncReportForTest
  resetSyncReport()
})

describe('后台同步的结局 → 日志', () => {
  it('成功：安静（不刷屏）', () => {
    reportSyncOutcome({ ok: true }, ['font.tags'])
    reportSyncOutcome({ ok: true }, ['font.tags'])

    expect(log.dump()).not.toContain('云同步恢复正常')
  })

  it('失败后再成功：留一条"恢复正常"，并带上上次的失败码', () => {
    reportSyncOutcome({ ok: false, errorCode: 'CLOUD_PERMISSION', error: 'HTTP 403' }, [
      'font.tags',
    ])
    reportSyncOutcome({ ok: true }, ['font.tags'])

    expect(log.dump()).toContain('云同步恢复正常')
    expect(log.dump()).toContain('CLOUD_PERMISSION')
  })

  it('失败：带码、带原因原文，且每次都记（退避已限频，少一条就是少一份证据）', () => {
    reportSyncOutcome({ ok: false, errorCode: 'CLOUD_NETWORK', error: 'GAS HTTP 500' }, [
      'font.tags',
    ])
    reportSyncOutcome({ ok: false, errorCode: 'CLOUD_NETWORK', error: 'GAS HTTP 500' }, [
      'font.tags',
    ])

    const dumped = log.dump()
    expect(dumped).toContain('后台同步未完成')
    expect(dumped).toContain('CLOUD_NETWORK')
    expect(dumped).toContain('GAS HTTP 500')
    expect(dumped.split('后台同步未完成')).toHaveLength(3) // 两次都记了
  })

  it('跳过：只在原因变化时记，且写明"没发请求、不消耗退避"', () => {
    const offline: SyncOutcome = {
      ok: false,
      skip: true,
      errorCode: 'CLOUD_OFFLINE',
      error: '当前离线',
    }
    reportSyncOutcome(offline, [])
    reportSyncOutcome(offline, [])
    reportSyncOutcome(
      { ok: false, skip: true, errorCode: 'CLOUD_NO_LEDGER', error: '没有台账' },
      [],
    )

    const dumped = log.dump()
    expect(dumped.split('后台同步本轮跳过')).toHaveLength(3) // 离线只记一次 + 台账一次
    expect(dumped).toContain('不消耗退避')
    expect(dumped).toContain('CLOUD_NO_LEDGER')
  })

  it('抛错（没走到 outcome）：error 级，带上原 error', () => {
    reportSyncError(new Error('EPERM: 台账写不进去'))

    const dumped = log.dump()
    expect(dumped).toContain('后台同步抛错')
    expect(dumped).toContain('EPERM')
  })
})
