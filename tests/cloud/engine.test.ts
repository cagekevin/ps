import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

/** 契约测试，非实机：任何真实网络请求都让用例失败 */
const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

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
  let pendingRecord: ReturnType<typeof vi.fn>
  let pendingList: ReturnType<typeof vi.fn>
  let pendingClear: ReturnType<typeof vi.fn>
  let deps: CloudDeps
  let engine: ReturnType<typeof createCloudEngine>

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchGuard)
    fetchGuard.mockClear()
    readA = vi.fn().mockResolvedValue(payloadA)
    writeA = vi.fn().mockResolvedValue({ ok: true })
    readB = vi.fn().mockResolvedValue(payloadB)
    writeB = vi.fn().mockResolvedValue({ ok: true })
    pull = vi.fn().mockResolvedValue(null)
    push = vi.fn().mockResolvedValue(undefined)
    ledgerRead = vi.fn().mockReturnValue(null)
    ledgerWrite = vi.fn()
    configured = vi.fn().mockReturnValue(true)
    pendingRecord = vi.fn()
    pendingList = vi.fn(() => [])
    pendingClear = vi.fn()

    deps = {
      config: { isConfigured: configured, isAutoSyncEnabled: () => false },
      transport: { pull, push },
      ledger: { read: ledgerRead, write: ledgerWrite },
      pending: { record: pendingRecord, list: pendingList, clear: pendingClear },
      entries: [
        { id: 'font.stars', schema: 1, read: readA, write: writeA },
        { id: 'font.tags', schema: 1, read: readB, write: writeB },
      ],
    }
    engine = createCloudEngine(deps)
  })

  afterEach(() => {
    expect(fetchGuard).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('云端为空时首次上传 rev=1，并写台账', async () => {
    const result = await engine.upload()

    expect(result).toMatchObject({ ok: true, count: 2 })
    const snapshot = push.mock.calls[0][0]
    expect(snapshot.rev).toBe(1)
    expect(ledgerWrite).toHaveBeenCalledWith(
      expect.objectContaining({ rev: 1, localHash: expect.any(String) }),
    )
    // 整包上传成功 = 所有 unit 对齐，后台留的待同步痕迹要清掉
    expect(pendingClear).toHaveBeenCalled()
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
    expect(pendingClear).toHaveBeenCalled()
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

  it('getStatus 反映待同步痕迹数量', () => {
    pendingList.mockReturnValue([{ unit: 'font.tags', at: 1, reason: 'not-configured' }])

    expect(engine.getStatus().pending).toBe(1)
  })

  it('未配置时 pushUnits 明确返回 CLOUD_NOT_CONFIGURED，且不读云端、不发请求', async () => {
    configured.mockReturnValue(false)

    const result = await engine.pushUnits(['font.tags'])

    // 契约测试，非实机：只断言"端口没被调用"，真实服务端行为未验
    expect(result).toMatchObject({
      ok: false,
      errorCode: 'CLOUD_NOT_CONFIGURED',
      pending: ['font.tags'],
    })
    expect(pull).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(pendingRecord).toHaveBeenCalledWith(['font.tags'], 'not-configured')
  })

  it('只推指定 unit：云端其它 unit 原样保留，rev+1，台账记 per-unit 指纹', async () => {
    const cloudB = { ...toUnit(payloadB), hash: 'cloud-b' }
    pull.mockResolvedValue(cloudView({ 'font.stars': toUnit(payloadA), 'font.tags': cloudB }))
    ledgerRead.mockReturnValue({
      rev: 3,
      syncedAt: 100,
      localHash: 'whatever',
      units: { 'font.stars': toUnit(payloadA).hash, 'font.tags': 'cloud-b' },
    })

    const result = await engine.pushUnits(['font.tags'])

    expect(result).toMatchObject({ ok: true, count: 1, pushed: ['font.tags'], rev: 4 })
    const snapshot = push.mock.calls[0][0]
    expect(snapshot.rev).toBe(4)
    // 别的 unit 没被重算，也不会从快照里消失
    expect(snapshot.units['font.stars']).toEqual(toUnit(payloadA))
    expect(snapshot.units['font.tags'].hash).toBe(toUnit(payloadB).hash)

    const written = ledgerWrite.mock.calls[0][0]
    expect(written.rev).toBe(4)
    expect(written.units).toEqual({
      'font.stars': toUnit(payloadA).hash,
      'font.tags': toUnit(payloadB).hash,
    })
    expect(written.localHash).toBe(unitsHash(snapshot.units))
    expect(pendingClear).toHaveBeenCalledWith(['font.tags'])
  })

  it('云端内容已经一致时跳过，不 push', async () => {
    pull.mockResolvedValue(
      cloudView({ 'font.stars': toUnit(payloadA), 'font.tags': toUnit(payloadB) }),
    )

    const result = await engine.pushUnits(['font.tags'])

    expect(result).toMatchObject({ ok: true, skipped: true, count: 0 })
    expect(push).not.toHaveBeenCalled()
    expect(ledgerWrite).not.toHaveBeenCalled()
  })

  it('两边都改过 → 无确认时取消，并留 pending 痕迹', async () => {
    pull.mockResolvedValue(
      cloudView(
        { 'font.stars': toUnit(payloadA), 'font.tags': { ...toUnit(payloadB), hash: 'cloud-b' } },
        5,
      ),
    )
    ledgerRead.mockReturnValue({
      rev: 3,
      syncedAt: 100,
      localHash: 'whatever',
      units: { 'font.stars': toUnit(payloadA).hash, 'font.tags': 'synced-b' },
    })

    const result = await engine.pushUnits(['font.tags'])

    expect(result).toMatchObject({
      ok: false,
      cancelled: true,
      errorCode: 'CLOUD_REV_CONFLICT',
      pending: ['font.tags'],
    })
    expect(push).not.toHaveBeenCalled()
    expect(pendingRecord).toHaveBeenCalledWith(['font.tags'], 'conflict')
  })

  it('冲突确认后照常推送', async () => {
    pull.mockResolvedValue(
      cloudView(
        { 'font.stars': toUnit(payloadA), 'font.tags': { ...toUnit(payloadB), hash: 'cloud-b' } },
        5,
      ),
    )
    ledgerRead.mockReturnValue({
      rev: 3,
      syncedAt: 100,
      localHash: 'whatever',
      units: { 'font.stars': toUnit(payloadA).hash, 'font.tags': 'synced-b' },
    })
    const onConfirm = vi.fn().mockResolvedValue(true)

    const result = await engine.pushUnits(['font.tags'], { onConfirm })

    expect(onConfirm).toHaveBeenCalledWith({ units: ['font.tags'], cloudRev: 5 })
    expect(result).toMatchObject({ ok: true, rev: 6 })
    expect(push).toHaveBeenCalled()
  })

  it('别人改的是别的 unit 时不算冲突（本条照推）', async () => {
    pull.mockResolvedValue(
      cloudView(
        {
          'font.stars': { ...toUnit(payloadA), hash: 'someone-else' },
          'font.tags': { ...toUnit(payloadB), hash: 'cloud-b' },
        },
        7,
      ),
    )
    ledgerRead.mockReturnValue({
      rev: 3,
      syncedAt: 100,
      localHash: 'whatever',
      units: { 'font.stars': toUnit(payloadA).hash, 'font.tags': 'cloud-b' },
    })

    const result = await engine.pushUnits(['font.tags'])

    expect(result).toMatchObject({ ok: true, pushed: ['font.tags'], rev: 8 })
  })

  it('push 失败时记 pending(network)，不写台账', async () => {
    pull.mockResolvedValue(cloudView({}, 0))
    push.mockRejectedValue(new Error('网络失败'))

    const result = await engine.pushUnits(['font.tags'], { force: true })

    expect(result).toMatchObject({ ok: false, errorCode: 'CLOUD_NETWORK', pending: ['font.tags'] })
    expect(ledgerWrite).not.toHaveBeenCalled()
    expect(pendingRecord).toHaveBeenCalledWith(['font.tags'], 'network')
  })

  it('未注册的 unit 直接报错，不 pull 不 push', async () => {
    const result = await engine.pushUnits(['nope'])

    expect(result).toMatchObject({ ok: false, errorCode: 'CLOUD_COLLECT_FAILED' })
    expect(pull).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('回归：pushUnits 之后整包 upload 仍然「内容一致就跳过」', async () => {
    // 云端两项都在，本地只改了 font.tags
    const payloadB2: UnitPayload = {
      schema: 1,
      files: [
        {
          path: '/b.json',
          size: 7,
          content: { kind: 'inline', data: '{"v":2}', encoding: 'json' },
        },
      ],
    }
    const cloudB = { ...toUnit(payloadB), hash: 'cloud-b' }
    pull.mockResolvedValue(cloudView({ 'font.stars': toUnit(payloadA), 'font.tags': cloudB }))
    ledgerRead.mockReturnValue({
      rev: 3,
      syncedAt: 100,
      localHash: unitsHash({ 'font.stars': toUnit(payloadA), 'font.tags': cloudB }),
      units: { 'font.stars': toUnit(payloadA).hash, 'font.tags': cloudB.hash },
    })
    readB.mockResolvedValue(payloadB2)

    const pushed = await engine.pushUnits(['font.tags'])
    expect(pushed).toMatchObject({ ok: true, pushed: ['font.tags'] })

    // 模拟推送生效：云端 = 刚 push 的快照；台账 = 刚写入的记录
    const snapshot = push.mock.calls[0][0]
    pull.mockResolvedValue({
      rev: snapshot.rev,
      updatedAt: snapshot.updatedAt,
      units: snapshot.units,
      raw: snapshot,
    })
    ledgerRead.mockReturnValue(ledgerWrite.mock.calls[0][0])

    const second = await engine.upload()

    expect(second).toMatchObject({ ok: true, skipped: true })
    // 整包上传没有第二次 push：per-unit 台账没有破坏 inSync 判定
    expect(push).toHaveBeenCalledTimes(1)
  })
})
