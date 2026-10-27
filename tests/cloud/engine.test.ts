import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  CloudError,
  buildSnapshot,
  unitHash,
  unitsHash,
  type CloudLedger,
  type CloudPullOutcome,
  type CloudSnapshotView,
  type SyncUnit,
  type SyncUnitAdapter,
  type UnitPayload,
} from '@/domain/cloud'
import type { CloudDeps, CloudLedgerRecord } from '@/cloud/types'
import { createCloudEngine } from '@/cloud/engine'

/**
 * T-114：坏台账的哨兵。用例把它喂给 `ledgerRead` 就表示"文件在、但读不到"
 * （与 `null` = 从来没有台账 区分开）。用 `symbol` 而不是 `as unknown as`，
 * 是为了让类型自己分得开——转型会把"两种东西"又混回一个。
 */
const BROKEN = Symbol('broken-ledger')

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

/**
 * pull 的 `ok` 三态。之后 `pull()` 不再返回裸 view / null
 * 所以这里把"造一份云端快照"封成 outcome，用例侧写法不变。
 */
function cloudView(units: Record<string, SyncUnit>, rev = 3): CloudPullOutcome {
  const snapshot: CloudSnapshotView = {
    rev,
    updatedAt: 100,
    units,
    raw: buildSnapshot(units, rev, 100),
  }
  return { status: 'ok', value: snapshot }
}

/** 契约测试，非实机：任何真实网络请求都让用例失败 */
const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

describe('cloud engine', () => {
  // mock 按端口签名逐个标注：`Mock<T>` 才是 T 的子类型，能直接塞进 `CloudDeps`；
  // `ReturnType<typeof vi.fn>` 是 `Mock<Procedure | Constructable>`，与任何具体签名都不兼容
  let readA: Mock<SyncUnitAdapter['read']>
  let writeA: Mock<SyncUnitAdapter['write']>
  let readB: Mock<SyncUnitAdapter['read']>
  let writeB: Mock<SyncUnitAdapter['write']>
  let pull: Mock<CloudDeps['transport']['pull']>
  let push: Mock<CloudDeps['transport']['push']>
  /**
   * T-114：`CloudLedgerPort.read` 现在返回 `Promise<LedgerRead>`（三态）。
   * 用例仍只表达"台账内容是什么"（`null` = 没有），由下面这层适配成三态——
   * 这样十几处 `ledgerRead.mockReturnValue(...)` 不用逐个改写，也不会因为
   * 忘了包一层而静默测到别的东西。
   */
  let ledgerRead: Mock<() => CloudLedgerRecord | null | typeof BROKEN>
  let ledgerWrite: Mock<CloudDeps['ledger']['write']>
  let configured: Mock<CloudDeps['config']['isConfigured']>
  let pendingRecord: Mock<CloudDeps['pending']['record']>
  let pendingList: Mock<CloudDeps['pending']['list']>
  let pendingClear: Mock<CloudDeps['pending']['clear']>
  let deps: CloudDeps
  let engine: ReturnType<typeof createCloudEngine>

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchGuard)
    fetchGuard.mockClear()
    readA = vi.fn<SyncUnitAdapter['read']>().mockResolvedValue(payloadA)
    writeA = vi.fn<SyncUnitAdapter['write']>().mockResolvedValue({ status: 'ok' })
    readB = vi.fn<SyncUnitAdapter['read']>().mockResolvedValue(payloadB)
    writeB = vi.fn<SyncUnitAdapter['write']>().mockResolvedValue({ status: 'ok' })
    pull = vi.fn<CloudDeps['transport']['pull']>().mockResolvedValue({ status: 'notSeen' })
    push = vi.fn<CloudDeps['transport']['push']>().mockResolvedValue(undefined)
    ledgerRead = vi.fn<() => CloudLedgerRecord | null | typeof BROKEN>().mockReturnValue(null)
    ledgerWrite = vi.fn<CloudDeps['ledger']['write']>()
    configured = vi.fn<CloudDeps['config']['isConfigured']>().mockReturnValue(true)
    pendingRecord = vi.fn<CloudDeps['pending']['record']>()
    pendingList = vi.fn<CloudDeps['pending']['list']>(() => [])
    pendingClear = vi.fn<CloudDeps['pending']['clear']>()

    deps = {
      config: { isConfigured: configured, isAutoSyncEnabled: () => false },
      transport: { pull, push },
      ledger: {
        // 用例只设"台账内容"（`null` = 没有台账）；坏台账用 `BROKEN` 哨兵表示
        read: async () => {
          const raw = ledgerRead()
          if (typeof raw === 'symbol') {
            return {
              status: 'error' as const,
              fail: 'readError' as const,
              reason: '台账读不到',
              failure: {
                kind: 'errno' as const,
                code: 'EPERM',
                raw: new Error('EPERM: operation not permitted'),
              },
            }
          }
          return raw === null
            ? { status: 'notSeen' as const }
            : { status: 'ok' as const, value: raw }
        },
        write: ledgerWrite,
      },
      pending: { record: pendingRecord, list: pendingList, clear: pendingClear },
      entries: [
        // `watch` 是 engine 用不到的触发源声明（订阅归 `cep/cloud/change-sync.ts`），
        // 但 `SyncUnitAdapter` 里它是必填：漏声明 = 新增同步项静默不同步
        { id: 'font.stars', schema: 1, read: readA, write: writeA, watch: () => () => {} },
        { id: 'font.tags', schema: 1, read: readB, write: writeB, watch: () => () => {} },
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

    expect(result).toMatchObject({ status: 'ok' })
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

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_COLLECT_FAILED' } })
    expect(push).not.toHaveBeenCalled()
    expect(ledgerWrite).not.toHaveBeenCalled()
  })

  it('内容一致时跳过，不 push', async () => {
    const units = { 'font.stars': toUnit(payloadA), 'font.tags': toUnit(payloadB) }
    pull.mockResolvedValue(cloudView(units))
    const ledger: CloudLedger = { rev: 3, syncedAt: 100, localHash: unitsHash(units) }
    ledgerRead.mockReturnValue(ledger)

    const result = await engine.upload()

    expect(result).toMatchObject({ status: 'ok' })
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

    expect(result).toMatchObject({ status: 'cancelled', failure: { fail: 'CLOUD_REV_CONFLICT' } })
    expect(push).not.toHaveBeenCalled()
  })

  it('push 失败不写台账', async () => {
    push.mockRejectedValue(new Error('网络失败'))

    const result = await engine.upload()

    expect(result.status).toBe('error')
    expect(ledgerWrite).not.toHaveBeenCalled()
  })

  it('download 全部成功才写台账', async () => {
    pull.mockResolvedValue(
      cloudView({ 'font.stars': toUnit(payloadA), 'font.tags': toUnit(payloadB) }),
    )

    const result = await engine.download()

    expect(result).toMatchObject({ status: 'ok' })
    expect(ledgerWrite).toHaveBeenCalled()
    expect(pendingClear).toHaveBeenCalled()
  })

  it('download 部分失败不写台账', async () => {
    pull.mockResolvedValue(
      cloudView({ 'font.stars': toUnit(payloadA), 'font.tags': toUnit(payloadB) }),
    )
    writeB.mockResolvedValue({ status: 'error', reason: '写失败' })

    const result = await engine.download()

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_WRITE_FAILED' } })
    expect(ledgerWrite).not.toHaveBeenCalled()
  })

  it('getStatus 反映待同步痕迹数量', async () => {
    pendingList.mockReturnValue([{ unit: 'font.tags', at: 1, reason: 'not-configured' }])

    expect((await engine.getStatus()).pending).toBe(1)
  })

  it('未配置时 pushUnits 明确返回 CLOUD_NOT_CONFIGURED，且不读云端、不发请求', async () => {
    configured.mockReturnValue(false)

    const result = await engine.pushUnits(['font.tags'])

    // 契约测试，非实机：只断言"端口没被调用"，真实服务端行为未验
    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_NOT_CONFIGURED' } })
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

    expect(result).toMatchObject({ status: 'ok' })
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

    expect(result).toMatchObject({ status: 'ok' })
    expect(push).not.toHaveBeenCalled()
    expect(ledgerWrite).not.toHaveBeenCalled()
  })

  /**
   * 基线写盘失败不许伪装成"内容一致、已是最新"。
   *
   * 以前 `refreshBaseline()` 里的 `ledger.write` 没包 try（同一调用在推送路径上包了）：
   * 抛出去冒到队列的 catch → 没人接 → 既不 log 也不留痕，用户只看到"上次同步时间不动"。
   */
  it('内容一致但基线写盘失败 → 报 CLOUD_WRITE_FAILED 并留痕，不装作已是最新', async () => {
    pull.mockResolvedValue(cloudView({ 'font.tags': toUnit(payloadB) }))
    ledgerRead.mockReturnValue({
      rev: 3,
      syncedAt: 100,
      localHash: 'whatever',
      units: { 'font.tags': toUnit(payloadB).hash },
    })
    ledgerWrite.mockImplementation(() => {
      throw new Error('EPERM: 台账写不进去')
    })

    const result = await engine.pushUnits(['font.tags'])

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_WRITE_FAILED' } })
    expect(pendingRecord).toHaveBeenCalledWith(['font.tags'], 'network', 'CLOUD_WRITE_FAILED')
  })

  it('T-76①：没有 per-unit 基线（老台账）时首推视为新增，并写入基线', async () => {
    pull.mockResolvedValue(
      cloudView(
        { 'font.stars': toUnit(payloadA), 'font.tags': { ...toUnit(payloadB), hash: 'cloud-b' } },
        5,
      ),
    )
    // 老台账：有 rev / localHash，但没有 units —— 修复前这里一律判冲突，首推必死
    ledgerRead.mockReturnValue({ rev: 3, syncedAt: 100, localHash: 'legacy' })

    const result = await engine.pushUnits(['font.tags'])

    expect(result).toMatchObject({ status: 'ok' })
    const written = ledgerWrite.mock.calls[0][0]
    expect(written.units?.['font.tags']).toBe(toUnit(payloadB).hash)
  })

  it('T-76②：内容一致 skipped 时也把 per-unit 基线刷新到当前云端', async () => {
    pull.mockResolvedValue(
      cloudView({ 'font.stars': toUnit(payloadA), 'font.tags': toUnit(payloadB) }, 5),
    )
    // 基线停在上次推送时的旧值：不刷新的话，本地之后真改了会拿旧 base 判出「两边都改」
    ledgerRead.mockReturnValue({
      rev: 3,
      syncedAt: 100,
      localHash: 'old',
      units: { 'font.stars': toUnit(payloadA).hash, 'font.tags': 'stale-b' },
    })

    const result = await engine.pushUnits(['font.tags'])

    expect(result).toMatchObject({ status: 'ok' })
    expect(push).not.toHaveBeenCalled()
    const written = ledgerWrite.mock.calls[0][0]
    expect(written.rev).toBe(5)
    expect(written.units?.['font.tags']).toBe(toUnit(payloadB).hash)
  })

  it('T-76③：一个 unit 读失败不拖死整批，失败的记 pending 其余照推', async () => {
    readB.mockRejectedValue(new Error('sj_set.json 不存在'))
    pull.mockResolvedValue(cloudView({}, 0))

    const result = await engine.pushUnits(['font.stars', 'font.tags'])

    expect(result).toMatchObject({ status: 'ok' })
    expect(pendingRecord).toHaveBeenCalledWith(['font.tags'], 'collect-failed')
    const snapshot = push.mock.calls[0][0]
    expect(snapshot.units['font.stars']).toBeDefined()
    expect(snapshot.units['font.tags']).toBeUndefined()
  })

  it('T-76③：全部 unit 都读失败时不 push，并报读取失败', async () => {
    readA.mockRejectedValue(new Error('a 读不到'))
    readB.mockRejectedValue(new Error('b 读不到'))

    const result = await engine.pushUnits(['font.stars', 'font.tags'])

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_COLLECT_FAILED' } })
    expect(pendingRecord).toHaveBeenCalledWith(['font.stars', 'font.tags'], 'collect-failed')
    expect(push).not.toHaveBeenCalled()
  })

  it('T-76①：老台账首推成功后基线就位，第二次推送不再判冲突', async () => {
    pull.mockResolvedValue(
      cloudView(
        { 'font.stars': toUnit(payloadA), 'font.tags': { ...toUnit(payloadB), hash: 'cloud-b' } },
        5,
      ),
    )
    // 存量用户的台账：有 rev / localHash，没有 units
    ledgerRead.mockReturnValue({ rev: 3, syncedAt: 100, localHash: 'legacy' })

    const first = await engine.pushUnits(['font.tags'])
    expect(first).toMatchObject({ status: 'ok' })

    // 模拟推送生效：云端 = 刚推上去的快照；台账 = 刚写入的记录
    const snapshot = push.mock.calls[0][0]
    pull.mockResolvedValue({
      status: 'ok',
      value: {
        rev: snapshot.rev,
        updatedAt: snapshot.updatedAt,
        units: snapshot.units,
        raw: snapshot,
      },
    })
    ledgerRead.mockReturnValue(ledgerWrite.mock.calls[0][0])

    const second = await engine.pushUnits(['font.tags'])

    expect(second).toMatchObject({ status: 'ok' })
    expect(push).toHaveBeenCalledTimes(1)
    expect(ledgerWrite.mock.calls[1][0].units?.['font.tags']).toBe(toUnit(payloadB).hash)
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

    expect(result).toMatchObject({ status: 'cancelled', failure: { fail: 'CLOUD_REV_CONFLICT' } })
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
    expect(result).toMatchObject({ status: 'ok' })
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

    expect(result).toMatchObject({ status: 'ok' })
  })

  it('push 失败时记 pending(network)，不写台账', async () => {
    pull.mockResolvedValue(cloudView({}, 0))
    push.mockRejectedValue(new Error('网络失败'))

    const result = await engine.pushUnits(['font.tags'], { force: true })

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_NETWORK' } })
    expect(ledgerWrite).not.toHaveBeenCalled()
    expect(pendingRecord).toHaveBeenCalledWith(['font.tags'], 'network')
  })

  /**
   * 失败痕迹要带得上"到底哪一类失败"。
   *
   * 只记 `network` 的结果：日志与状态里 401/403/429/超时逐字相同，
   * 用户按"网络失败，会在后台重试"去等一个**永远不会自己好**的权限错。
   */
  it('权限错误记 pending 时带上错误码（不是只有 reason）', async () => {
    pull.mockResolvedValue(cloudView({}, 0))
    push.mockRejectedValue(new CloudError('CLOUD_PERMISSION', 'HTTP 403'))

    const result = await engine.pushUnits(['font.tags'], { force: true })

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_PERMISSION' } })
    expect(pendingRecord).toHaveBeenCalledWith(['font.tags'], 'network', 'CLOUD_PERMISSION')
  })

  it('未注册的 unit 直接报错，不 pull 不 push', async () => {
    const result = await engine.pushUnits(['nope'])

    expect(result).toMatchObject({ status: 'error', failure: { fail: 'CLOUD_COLLECT_FAILED' } })
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
    expect(pushed).toMatchObject({ status: 'ok' })

    // 模拟推送生效：云端 = 刚 push 的快照；台账 = 刚写入的记录
    const snapshot = push.mock.calls[0][0]
    pull.mockResolvedValue({
      status: 'ok',
      value: {
        rev: snapshot.rev,
        updatedAt: snapshot.updatedAt,
        units: snapshot.units,
        raw: snapshot,
      },
    })
    ledgerRead.mockReturnValue(ledgerWrite.mock.calls[0][0])

    const second = await engine.upload()

    expect(second).toMatchObject({ status: 'ok' })
    // 整包上传没有第二次 push：per-unit 台账没有破坏 inSync 判定
    expect(push).toHaveBeenCalledTimes(1)
  })

  /**
   * T-114：**坏台账不许被读成"没有台账"**。
   *
   * 以前的形态是 `read()` 返回 `CloudLedger | null`，读不到也返回 `null`，于是
   * `getStatus()` 报 `hasLedger:false` / `rev:0`，`decideUpload` 判成 `cloud-newer`。
   * 用户看到"本地还没有同步记录"就点「上传」，云端那一份被覆盖掉。
   */
  describe('坏台账（T-114）', () => {
    it('判据 A：EPERM → ledgerState 是 broken，不是 none', async () => {
      ledgerRead.mockReturnValue(BROKEN)

      const status = await engine.getStatus()

      expect(status.ledgerState.status).toBe('error')
      // 断结构不断文案：是读盘失败、码是 EPERM。文案归 `msg`，这里钉它等于钉死措辞。
      expect(
        status.ledgerState.status === 'error' && status.ledgerState.fail === 'readError'
          ? status.ledgerState.failure
          : null,
      ).toMatchObject({ kind: 'errno', code: 'EPERM' })
    })

    it('判据 A：文件不在（ENOENT）→ 才是 none', async () => {
      ledgerRead.mockReturnValue(null)

      expect((await engine.getStatus()).ledgerState.status).toBe('notSeen')
    })

    it('判据 B：坏台账 → upload 直接拒绝，一次 push 都不发（不当成首次同步全量重推）', async () => {
      ledgerRead.mockReturnValue(BROKEN)

      const result = await engine.upload()

      expect(result.status).toBe('error')
      expect(result).toMatchObject({ failure: { fail: 'CLOUD_LEDGER_BROKEN' } })
      // `reason` 是台账底层的读失败原文（系统给的），不是拼出来的中文
      expect(result).toMatchObject({ failure: { reason: 'EPERM: operation not permitted' } })
      expect(push).not.toHaveBeenCalled()
    })

    it('判据 B：坏台账 → pushUnits 也拒绝（后台那条路同样不许推）', async () => {
      ledgerRead.mockReturnValue(BROKEN)

      const result = await engine.pushUnits(['font.tags'])

      expect(result.status).toBe('error')
      expect(result).toMatchObject({ failure: { fail: 'CLOUD_LEDGER_BROKEN' } })
      expect(push).not.toHaveBeenCalled()
    })
  })
})
