import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CloudStatus } from '@/cloud/types'

/**
 * 后台同步失败之后，**设置页的状态要被推着刷新**。
 *
 * 以前只有三条 refresh 时机（挂载 / 拉取成功 / 切开关），5 秒定时器只刷内存脏数——
 * 痕迹写在盘上，用户看不见，"没同步成功"那句永远不出现，关掉重开才有。
 *
 * 判据沿用「记跃迁不记心跳」：结局签名变了才刷新，同一失败连发两次不重复读盘。
 */

const engine = vi.hoisted(() => ({ getStatus: vi.fn() }))

vi.mock('@/cep/cloud/setup', () => ({
  cloudEngine: {
    getStatus: engine.getStatus,
    upload: vi.fn(),
    download: vi.fn(),
    pushUnits: vi.fn(),
  },
  cloudSyncQueue: { pendingUnits: () => [], busy: () => false },
}))

import { bindCloudData, useCloudStore } from '@/stores/cloud'
import { __resetSyncReportForTest, reportSyncOutcome } from '@/cep/cloud/sync-report'

function status(over: Partial<CloudStatus> = {}): CloudStatus {
  return {
    configured: true,
    autoSyncEnabled: true,
    ledgerState: { status: 'ok', value: { rev: 1, syncedAt: 0, localHash: 'h' } },
    rev: 1,
    syncedAt: 0,
    localHash: 'h',
    pending: 0,
    pendingItems: [],
    ...over,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  engine.getStatus.mockReset()
  engine.getStatus.mockResolvedValue(status())
  __resetSyncReportForTest()
  bindCloudData()
})

describe('后台结局 → 状态刷新（TD-11-9）', () => {
  it('后台失败后，store 里拿到盘上的痕迹（页面据此显示"没同步成功"）', async () => {
    engine.getStatus.mockResolvedValue(
      status({
        pending: 1,
        pendingItems: [{ unit: 'font.tags', at: 1, reason: 'network', code: 'CLOUD_PERMISSION' }],
      }),
    )

    reportSyncOutcome(
      { status: 'error', failure: { fail: 'CLOUD_PERMISSION', reason: 'HTTP 403' } },
      ['font.tags'],
    )
    await vi.waitFor(() => expect(useCloudStore().status.pendingItems).toHaveLength(1))

    expect(useCloudStore().status.pendingItems[0]).toMatchObject({ unit: 'font.tags' })
  })

  it('同一失败连发两次只刷一次（别把跃迁判据退化成心跳）', async () => {
    reportSyncOutcome({ status: 'error', failure: { fail: 'CLOUD_NETWORK', reason: 'boom' } }, [
      'font.tags',
    ])
    await vi.waitFor(() => expect(engine.getStatus).toHaveBeenCalledTimes(1))

    reportSyncOutcome({ status: 'error', failure: { fail: 'CLOUD_NETWORK', reason: 'boom' } }, [
      'font.tags',
    ])
    await Promise.resolve()
    expect(engine.getStatus).toHaveBeenCalledTimes(1)
  })

  it('从失败恢复正常也刷一次（页面要能把"没同步成功"收回去）', async () => {
    reportSyncOutcome({ status: 'error', failure: { fail: 'CLOUD_NETWORK', reason: 'boom' } }, [
      'font.tags',
    ])
    await vi.waitFor(() => expect(engine.getStatus).toHaveBeenCalledTimes(1))

    engine.getStatus.mockResolvedValue(status())
    reportSyncOutcome({ status: 'ok' }, ['font.tags'])
    await vi.waitFor(() => expect(engine.getStatus).toHaveBeenCalledTimes(2))
  })
})
