import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CloudErrorCode } from '@/domain/cloud'

/**
 * 8 个 `CLOUD_*` 码折成 2 个命令层码——**折掉的是码，不是信息**。
 *
 * 判据（阶段单 §四点三五 第 3 条）：新码必须有消费点。命令层只有两个消费者按码分流
 * （取消不提示 / 未配置去填地址），其余码没有任何人按它做不同的事，再分就是死码。
 * 但这不等于可以丢原因——用户看到的必须是引擎那句原文，这里逐码钉死。
 */

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))
const cloud = vi.hoisted(() => ({
  engine: { getStatus: vi.fn(), upload: vi.fn(), download: vi.fn(), pushUnits: vi.fn() },
  queue: { pendingUnits: () => [], busy: () => false },
}))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({
  jsx: {
    font: {},
    layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
    env: { setEnv: vi.fn() },
    action: {},
    style: {},
    rename: {},
    legacy: {},
    commonUse: {},
  },
}))
vi.mock('@/cep/cloud/setup', () => ({ cloudEngine: cloud.engine, cloudSyncQueue: cloud.queue }))

await import('@/commands')
const { execute } = await import('@/commands/registry')

/** 引擎实际会产出的码（含上一轮新加的权限 / 限流） */
const ENGINE_CODES: CloudErrorCode[] = [
  'CLOUD_NOT_CONFIGURED',
  'CLOUD_NETWORK',
  'CLOUD_PERMISSION',
  'CLOUD_RATE_LIMITED',
  'CLOUD_BAD_RESPONSE',
  'CLOUD_COLLECT_FAILED',
  'CLOUD_WRITE_FAILED',
  'CLOUD_REV_CONFLICT',
  'CLOUD_CANCELLED',
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  cloud.engine.download.mockResolvedValue({ status: 'ok' })
})

describe('云同步错误码折成命令层码', () => {
  it('除「取消」外，一律 NETWORK，且用户看到的是引擎原话（一个字都不丢）', async () => {
    for (const code of ENGINE_CODES) {
      if (code === 'CLOUD_CANCELLED') continue
      const message = `${code} 的具体原因`
      cloud.engine.download.mockResolvedValue({
        status: 'error',
        failure: { fail: code, reason: message },
      })

      const result = await execute('cloud.download', {
        onConfirm: async () => ({ ok: true, data: true }),
      })

      expect(result, code).toMatchObject({ status: 'error', fail: 'NETWORK', reason: message })
    }
  })

  it('取消 → CANCELLED（用户自己按的，不弹失败）', async () => {
    cloud.engine.download.mockResolvedValue({
      status: 'cancelled',
      failure: { fail: 'CLOUD_CANCELLED', reason: '取消操作' },
    })

    const result = await execute('cloud.download', {
      onConfirm: async () => ({ ok: true, data: true }),
    })

    expect(result).toEqual({ status: 'cancelled' })
  })

  it('未配置 → 原话透传（不许被包成「Photoshop 脚本初始化失败」，误导人去查 PS 脚本）', async () => {
    cloud.engine.download.mockResolvedValue({
      status: 'error',
      failure: { fail: 'CLOUD_NOT_CONFIGURED', reason: '未配置同步地址' },
    })

    const result = await execute('cloud.download', {
      onConfirm: async () => ({ ok: true, data: true }),
    })

    expect(result).toMatchObject({ status: 'error', fail: 'NETWORK', reason: '未配置同步地址' })
    if (result.status === 'error') expect(result.reason).not.toContain('脚本初始化失败')
  })

  it('冲突未确认（`cancelled` 臂带 `CLOUD_REV_CONFLICT`）不是用户取消，仍按失败处理', async () => {
    cloud.engine.download.mockResolvedValue({
      status: 'cancelled',
      failure: { fail: 'CLOUD_REV_CONFLICT', reason: '有 2 个同步项会被覆盖，需要确认' },
    })

    const result = await execute('cloud.download', {
      onConfirm: async () => ({ ok: true, data: true }),
    })

    expect(result).toMatchObject({ status: 'error', fail: 'NETWORK' })
  })
})
