import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { unitHash, type SyncUnit, type SyncUnitAdapter, type UnitPayload } from '@/domain/cloud'
import type { CloudDeps } from '@/cloud/types'
import { createCloudEngine } from '@/cloud/engine'
import { pullSnapshot } from '@/cep/cloud/transport'

/**
 * **云端读不懂 ≠ 云端为空**。
 *
 * 事故形态：网关回 200 但结构不符（`{"ok":true}` / 错误页 / 字段改名）→ 归一化以前返回 `null`
 * → 引擎判"云端是空的" → 用本地 rev=1 推上去，**云端那份被覆盖**，
 * 而用户看到的是一次**成功同步**。这条用例走**真 pull 接线**（真 `pullSnapshot` + 假 fetch），
 * 只把 `push` 换成 spy —— 所以要红就真的是"网关这一份回包会让覆盖发生"。
 */
const payload: UnitPayload = {
  schema: 1,
  files: [{ path: '/a.json', size: 2, content: { kind: 'inline', data: '{}', encoding: 'json' } }],
}

function toUnit(p: UnitPayload): SyncUnit {
  return { schema: p.schema, hash: unitHash(p), files: p.files }
}

function gatewayResponse(body: string): {
  ok: boolean
  status: number
  text: () => Promise<string>
} {
  return { ok: true, status: 200, text: async () => body }
}

let push: Mock<CloudDeps['transport']['push']>
let ledgerWrite: Mock<CloudDeps['ledger']['write']>
let readAdapter: Mock<SyncUnitAdapter['read']>
let engine: ReturnType<typeof createCloudEngine>

beforeEach(() => {
  push = vi.fn<CloudDeps['transport']['push']>().mockResolvedValue(undefined)
  ledgerWrite = vi.fn<CloudDeps['ledger']['write']>()
  readAdapter = vi.fn<SyncUnitAdapter['read']>().mockResolvedValue(payload)

  engine = createCloudEngine({
    config: { isConfigured: () => true, isAutoSyncEnabled: () => false },
    // 真 pull：走 normalizeCloudPayload 的真实判据
    transport: { pull: pullSnapshot, push },
    ledger: {
      read: async () => ({ status: 'notSeen' as const }),
      write: ledgerWrite,
    },
    pending: { record: vi.fn(), list: vi.fn(() => []), clear: vi.fn() },
    entries: [
      // `watch` 在 engine 这条链上用不到（订阅归 cep/cloud/change-sync.ts），但它是必填契约
      { id: 'font.tags', schema: 1, read: readAdapter, write: vi.fn(), watch: () => () => {} },
    ],
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('云端读不懂 → 拒绝覆盖（TD-11-5）', () => {
  it('网关回 {"ok":true}（无 units）→ 引擎拒绝推，云端内容一个字节没动', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(gatewayResponse('{"ok":true}')))

    const result = await engine.upload()

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_BAD_RESPONSE' } })
    // 不再包中文：reason 就是底层那句（响应原文片段）
    // 断结构：码 + 原话都在（`reason` 是"回包为什么读不懂"，不是用户话）
    expect(result).toMatchObject({
      failure: { fail: 'CLOUD_BAD_RESPONSE', reason: expect.any(String) },
    })
    // 「云端原内容不变」的可观察证据：一次写都没有发生
    expect(push).not.toHaveBeenCalled()
    expect(ledgerWrite).not.toHaveBeenCalled()
  })

  it('download 同样不许把"读不懂"说成「云端没有数据」', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(gatewayResponse('{"ok":true}')))

    const result = await engine.download()

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_BAD_RESPONSE' } })
    expect(result).toMatchObject({
      failure: { fail: 'CLOUD_BAD_RESPONSE', reason: expect.any(String) },
    })
  })

  it('pushUnits（后台单 unit）也不推', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(gatewayResponse('{"data":{}}')))

    const result = await engine.pushUnits(['font.tags'])

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_BAD_RESPONSE' } })
    expect(push).not.toHaveBeenCalled()
  })

  it('云端有坏 unit → 也拒绝（丢掉它等于下次整包抹掉云端那条）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        gatewayResponse(
          JSON.stringify({
            units: { 'font.tags': { hash: 'x', files: [] }, 'font.stars': { files: 'nope' } },
            rev: 2,
          }),
        ),
      ),
    )

    const result = await engine.upload()

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_BAD_RESPONSE' } })
    expect(push).not.toHaveBeenCalled()
  })

  it('服务端显式说"没有"（{data:null}）→ 照旧首推 rev=1（成功路径零变化）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(gatewayResponse('{"data":null}')))

    const result = await engine.upload()

    expect(result).toMatchObject({ status: 'ok' })
    expect(push.mock.calls[0][0].rev).toBe(1)
    expect(ledgerWrite).toHaveBeenCalledWith(expect.objectContaining({ rev: 1 }))
  })

  it('云端有数据 → 照旧按冲突/一致判定（成功路径零变化）', async () => {
    const unit = toUnit(payload)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          gatewayResponse(JSON.stringify({ units: { 'font.tags': unit }, rev: 3 })),
        ),
    )

    const result = await engine.upload()

    // 同一份内容 → 判"已同步"：跑完了，没推（`ok` 与「闸门挡下的 skipped」是两件事）
    expect(result).toMatchObject({ status: 'ok' })
    expect(push).not.toHaveBeenCalled()
  })
})
