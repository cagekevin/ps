import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildSnapshot,
  unitHash,
  unitsHash,
  type CloudLedger,
  type CloudSnapshotView,
  type SyncUnit,
  type UnitPayload,
} from '@/domain/cloud'
import type { CloudDeps } from '@/cloud/types'
import { createCloudEngine } from '@/cloud/engine'

const payloadA: UnitPayload = {
  schema: 1,
  files: [
    {
      path: '/a.json',
      size: 2,
      content: { kind: 'inline', data: '{}', encoding: 'json' },
    },
  ],
}

const payloadB: UnitPayload = {
  schema: 1,
  files: [
    {
      path: '/b.json',
      size: 2,
      content: { kind: 'inline', data: '{}', encoding: 'json' },
    },
  ],
}

function toUnit(payload: UnitPayload): SyncUnit {
  return {
    schema: payload.schema,
    hash: unitHash(payload),
    files: payload.files,
  }
}

function cloudView(units: Record<string, SyncUnit>, rev = 3): CloudSnapshotView {
  return {
    rev,
    updatedAt: 100,
    units,
    raw: buildSnapshot(units, rev, 100),
  }
}

describe('cloud engine', () => {
  let readA: ReturnType<typeof vi.fn>
  let writeA: ReturnType<typeof vi.fn>
  let readB: ReturnType<typeof vi.fn>
  let writeB: ReturnType<typeof vi.fn>
  let pull: ReturnType<typeof vi.fn>
  let push: ReturnType<typeof vi.fn>
  let ledgerRead: ReturnType<typeof vi.fn>
  let ledgerWrite: ReturnType<typeof vi.fn>
  let configured: ReturnType<typeof vi.fn>
  let deps: CloudDeps
  let engine: ReturnType<typeof createCloudEngine>

  beforeEach(() => {
    readA = vi.fn().mockResolvedValue(payloadA)
    writeA = vi.fn().mockResolvedValue({ ok: true })
    readB = vi.fn().mockResolvedValue(payloadB)
    writeB = vi.fn().mockResolvedValue({ ok: true })
    pull = vi.fn().mockResolvedValue(null)
    push = vi.fn().mockResolvedValue(undefined)
    ledgerRead = vi.fn().mockReturnValue(null)
    ledgerWrite = vi.fn()
    configured = vi.fn().mockReturnValue(true)

    deps = {
      config: { isConfigured: configured, isAutoSyncEnabled: () => false },
      transport: { pull, push },
      ledger: { read: ledgerRead, write: ledgerWrite },
      entries: [
        { id: 'font.stars', schema: 1, read: readA, write: writeA },
        { id: 'font.tags', schema: 1, read: readB, write: writeB },
      ],
    }
    engine = createCloudEngine(deps)
  })

  it('云端为空时首次上传 rev=1，并写台账', async () => {
    const result = await engine.upload()

    expect(result).toMatchObject({ ok: true, count: 2 })
    const snapshot = push.mock.calls[0][0]
    expect(snapshot.rev).toBe(1)
    expect(ledgerWrite).toHaveBeenCalledWith(
      expect.objectContaining({ rev: 1, localHash: expect.any(String) }),
    )
  })

  it('任一 adapter 读取失败时中止上传', async () => {
    readB.mockRejectedValue(new Error('读取失败'))

    const result = await engine.upload()

    expect(result).toMatchObject({ ok: false, errorCode: 'CLOUD_COLLECT_FAILED' })
    expect(push).not.toHaveBeenCalled()
    expect(ledgerWrite).not.toHaveBeenCalled()
  })

  it('内容一致时跳过，不 push', async () => {
    const units = { 'font.stars': toUnit(payloadA), 'font.tags': toUnit(payloadB) }
    pull.mockResolvedValue(cloudView(units))
    const ledger: CloudLedger = { rev: 3, syncedAt: 100, localHash: unitsHash(units) }
    ledgerRead.mockReturnValue(ledger)

    const result = await engine.upload()

    expect(result).toMatchObject({ ok: true, skipped: true })
    expect(push).not.toHaveBeenCalled()
  })

  it('无台账 + 云端有数据时不自动覆盖', async () => {
    pull.mockResolvedValue(
      cloudView({
        'font.stars': { ...toUnit(payloadA), hash: 'cloud-only' },
        'font.tags': toUnit(payloadB),
      }),
    )

    const result = await engine.upload()

    expect(result).toMatchObject({ ok: false, cancelled: true, errorCode: 'CLOUD_REV_CONFLICT' })
    expect(push).not.toHaveBeenCalled()
  })

  it('push 失败不写台账', async () => {
    push.mockRejectedValue(new Error('网络失败'))

    const result = await engine.upload()

    expect(result.ok).toBe(false)
    expect(ledgerWrite).not.toHaveBeenCalled()
  })

  it('download 全部成功才写台账', async () => {
    pull.mockResolvedValue(
      cloudView({ 'font.stars': toUnit(payloadA), 'font.tags': toUnit(payloadB) }),
    )

    const result = await engine.download()

    expect(result).toMatchObject({ ok: true, count: 2 })
    expect(ledgerWrite).toHaveBeenCalled()
  })

  it('download 部分失败不写台账', async () => {
    pull.mockResolvedValue(
      cloudView({ 'font.stars': toUnit(payloadA), 'font.tags': toUnit(payloadB) }),
    )
    writeB.mockResolvedValue({ ok: false, message: '写失败' })

    const result = await engine.download()

    expect(result).toMatchObject({
      ok: false,
      count: 1,
      partial: { failed: ['font.tags（写失败）'] },
    })
    expect(ledgerWrite).not.toHaveBeenCalled()
  })
})
