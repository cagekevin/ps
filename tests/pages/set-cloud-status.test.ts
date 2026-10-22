import { describe, expect, it } from 'vitest'
import type { CloudStatus, PendingChange } from '@/cloud/types'
import { describeCloudStatus, formatSyncedAt } from '@/pages/set/cloud-status'

/**
 * T-74：云同步三样状态（上次同步 / 待推送 / 冲突）的措辞。
 * 重点钉住两件事：
 * 1. 「队列里等自动同步」和「推失败过」是两个数，不能混；
 * 2. 「没配置地址」和「冲突」文案必须分开——用户要做的事完全不同。
 */
function status(over: Partial<CloudStatus> = {}): CloudStatus {
  return {
    configured: true,
    autoSyncEnabled: true,
    hasLedger: true,
    rev: 3,
    syncedAt: 0,
    localHash: 'h',
    pending: 0,
    pendingItems: [],
    ...over,
  }
}

function change(unit: string, reason: PendingChange['reason']): PendingChange {
  return { unit, at: 1, reason }
}

describe('formatSyncedAt', () => {
  it('0 表示从没同步过，不能被写成"很久以前"或一个时间', () => {
    expect(formatSyncedAt(0)).toBe('尚未同步')
  })

  it('有时间戳时输出本地时间 YYYY-MM-DD HH:mm', () => {
    const at = new Date(2026, 9, 23, 8, 5).getTime()
    expect(formatSyncedAt(at)).toBe('2026-10-23 08:05')
  })
})

describe('describeCloudStatus', () => {
  it('待推送（队列）与没同步成功（痕迹）分开显示，不合成一个数', () => {
    const view = describeCloudStatus({
      status: status({ pending: 1, pendingItems: [change('font.tags', 'network')] }),
      queuedUnits: 3,
    })

    expect(view.queuedText).toBe('3 项（等下一次自动同步）')
    expect(view.failedText).toBe('1 项：网络失败，会在后台重试')
    expect(view.conflictCount).toBe(0)
  })

  it('冲突不算进"没同步成功"，且文案要说清该做什么', () => {
    const view = describeCloudStatus({
      status: status({
        pending: 2,
        pendingItems: [change('font.tags', 'conflict'), change('action.library', 'conflict')],
      }),
      queuedUnits: 0,
    })

    expect(view.conflictCount).toBe(2)
    expect(view.failedText).toBe('')
    expect(view.conflictText).toContain('2 项')
    expect(view.conflictText).toContain('云端和本地都改过，需要你决定保留哪边')
    expect(view.conflictText).toContain('从云端拉取')
  })

  it('「首次没配置」与「冲突」的文案必须不一样', () => {
    const notConfigured = describeCloudStatus({
      status: status({ configured: false }),
      queuedUnits: 0,
    })
    const conflict = describeCloudStatus({
      status: status({ pendingItems: [change('font.tags', 'conflict')] }),
      queuedUnits: 0,
    })

    // 没配置：告诉他去填地址，不提冲突
    expect(notConfigured.notice).toContain('没设置同步地址')
    expect(notConfigured.notice).not.toContain('都改过')
    expect(notConfigured.conflictText).toBe('')

    // 冲突：告诉他决定保留哪边，不提地址
    expect(conflict.conflictText).toContain('都改过')
    expect(conflict.notice).toBe('')
  })

  it('没台账 / 自动同步关 各有一句解释（用户要做的事不同）', () => {
    expect(
      describeCloudStatus({ status: status({ hasLedger: false }), queuedUnits: 0 }).notice,
    ).toContain('本地还没有同步记录')
    expect(
      describeCloudStatus({ status: status({ autoSyncEnabled: false }), queuedUnits: 2 }).notice,
    ).toContain('自动同步已关闭')
  })

  it('同一种原因只写一次，不按 unit 重复五遍', () => {
    const view = describeCloudStatus({
      status: status({
        pending: 3,
        pendingItems: [
          change('font.tags', 'network'),
          change('font.stars', 'network'),
          change('font.hierarchy', 'network'),
        ],
      }),
      queuedUnits: 0,
    })

    expect(view.failedText).toBe('3 项：网络失败，会在后台重试')
  })

  it('队列为空时写「无」，不是 0 项', () => {
    expect(describeCloudStatus({ status: status(), queuedUnits: 0 }).queuedText).toBe('无')
  })
})
