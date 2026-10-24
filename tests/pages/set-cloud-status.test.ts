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
    // T-114：判别位是 `ledgerState`（三态），不再是一个 boolean
    ledgerState: { status: 'ok', ledger: { rev: 3, syncedAt: 0, localHash: 'h' } },
    rev: 3,
    syncedAt: 0,
    localHash: 'h',
    pending: 0,
    pendingItems: [],
    ...over,
  }
}

function change(unit: string, reason: PendingChange['reason'], code?: string): PendingChange {
  return { unit, at: 1, reason, ...(code ? { code } : {}) }
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
  /**
   * TD-11-2 的判据：这两个数**不是同一个概念的两种写法**，不许合并。
   * - 队列数（内存 `queuedUnits`）：本会话改了、还没到点，属于正常等待，用户不用做事；
   * - 痕迹数（落盘 `pending`）：以前推失败过，要么等重试、要么要用户处理。
   * 所以正确解法是让用户看出"两件事"，而不是把两个数揉成一个。
   */
  it('待推送（队列）与没同步成功（痕迹）分开显示，各自写明出处', () => {
    const view = describeCloudStatus({
      status: status({ pending: 1, pendingItems: [change('font.tags', 'network')] }),
      queuedUnits: 3,
    })

    expect(view.queuedText).toContain('3 项')
    expect(view.queuedText).toContain('本会话')
    expect(view.queuedText).toContain('不是失败')
    expect(view.failedText).toContain('1 项')
    expect(view.failedText).toContain('之前没推上去的')
    expect(view.failedText).toContain('网络失败，会在后台重试')
    expect(view.conflictCount).toBe(0)
  })

  it('两个数同时出现也各说各的：谁的数进谁的句子，不许串台', () => {
    const view = describeCloudStatus({
      status: status({ pending: 2, pendingItems: [change('font.tags', 'network')] }),
      queuedUnits: 5,
    })

    expect(view.queuedText).not.toContain('之前没推上去')
    expect(view.failedText).not.toContain('本会话')
    expect(view.queuedText).toContain('5 项')
    expect(view.failedText).toContain('1 项')
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
      describeCloudStatus({
        status: status({ ledgerState: { status: 'none' } }),
        queuedUnits: 0,
      }).notice,
    ).toContain('本地还没有同步记录')
    expect(
      describeCloudStatus({ status: status({ autoSyncEnabled: false }), queuedUnits: 2 }).notice,
    ).toContain('自动同步已关闭')
  })

  /**
   * T-114 判据 B：坏台账**不许**显示成"还没有同步记录"。
   *
   * 这两句文案的差别就是这次修 bug 的用户可见部分：前者会让用户以为自己是新设备，
   * 于是点「上传」把云端那一份覆盖掉。
   */
  it('坏台账：说的是"读不到 + 已停止上传"，不是"还没有同步记录"', () => {
    const view = describeCloudStatus({
      status: status({
        ledgerState: { status: 'broken', reason: 'EPERM: operation not permitted' },
      }),
      queuedUnits: 0,
    })

    expect(view.notice).toContain('读不到')
    expect(view.notice).toContain('暂停')
    expect(view.notice).not.toContain('还没有同步记录')
    // 「上次同步」也不能显示"尚未同步"——那也是"从没同步过"的说法
    expect(view.syncedText).not.toBe('尚未同步')
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

    expect(view.failedText).toBe('3 项（之前没推上去的，记在本地）：网络失败，会在后台重试')
  })

  it('队列为空时写「无」，不是 0 项', () => {
    expect(describeCloudStatus({ status: status(), queuedUnits: 0 }).queuedText).toBe('无')
  })
})

/**
 * TD-11-12：文案必须和真实行为一致。
 *
 * 两件事：
 * 1. 痕迹里带了错误码就**按码说**——`network` 这一桶里混着"会自动重试"（离线）
 *    和"不会自动重试"（权限），同一句"会在后台重试"对权限错是假的；
 * 2. 文案不许指向界面上**不存在的按钮**（「上传」没有入口），也要把"想保留本地"的
 *    真实代价说清（今天没有一键上传，只能拉取后重做）。
 */
describe('云同步文案与真实行为一致（TD-11-12）', () => {
  it('权限错：按码说"不会自动重试"，不再说"会在后台重试"', () => {
    const view = describeCloudStatus({
      status: status({
        pending: 1,
        pendingItems: [change('font.tags', 'network', 'CLOUD_PERMISSION')],
      }),
      queuedUnits: 0,
    })

    expect(view.failedText).toContain('权限被拒绝')
    expect(view.failedText).toContain('不会自动重试')
    expect(view.failedText).not.toContain('会在后台重试')
  })

  it('没有码时退回粗桶说法（老痕迹照样能读）', () => {
    const view = describeCloudStatus({
      status: status({ pending: 1, pendingItems: [change('font.tags', 'network')] }),
      queuedUnits: 0,
    })

    expect(view.failedText).toContain('网络失败，会在后台重试')
  })

  it('坏台账的提示不指向不存在的「上传」按钮', () => {
    const view = describeCloudStatus({
      status: status({ ledgerState: { status: 'broken', reason: 'EPERM' } }),
      queuedUnits: 0,
    })

    expect(view.notice).toContain('自动上传已暂停')
    expect(view.notice).not.toContain('「上传」')
  })

  it('冲突提示说清两边各自的代价（保留本地没有一键上传）', () => {
    const view = describeCloudStatus({
      status: status({ pending: 1, pendingItems: [change('font.tags', 'conflict')] }),
      queuedUnits: 0,
    })

    expect(view.conflictText).toContain('从云端拉取')
    expect(view.conflictText).toContain('目前没有一键上传')
  })
})
