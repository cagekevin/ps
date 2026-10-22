import {
  CloudError,
  buildSnapshot,
  decideUpload,
  diffUnits,
  unitHash,
  unitsHash,
  type CloudSnapshotView,
  type SyncDiff,
  type SyncUnit,
  type SyncUnitAdapter,
  type WriteOutcome,
} from '@/domain/cloud'
import type {
  CloudDeps,
  CloudStatus,
  DownloadOptions,
  DownloadResult,
  PushUnitsOptions,
  PushUnitsResult,
  UploadOptions,
  UploadResult,
} from './types'

export interface CloudEngine {
  getStatus(): CloudStatus
  upload(options?: UploadOptions): Promise<UploadResult>
  download(options?: DownloadOptions): Promise<DownloadResult>
  /**
   * 按 unit 增量推送（T-55/T-56）：pull → 只重算并替换指定 unit → push rev+1 → 写台账。
   *
   * 与 `upload()` 的分工：`upload` 是用户在设置页显式发起的整包同步（可弹冲突确认），
   * `pushUnits` 是后台跟随本地改动触发的局部推送（没有用户在场，冲突只能记痕迹）。
   */
  pushUnits(ids: string[], options?: PushUnitsOptions): Promise<PushUnitsResult>
}

function adapterMap(entries: SyncUnitAdapter[]): Map<string, SyncUnitAdapter> {
  return new Map(entries.map((entry) => [entry.id, entry]))
}

function toSyncUnit(payload: Awaited<ReturnType<SyncUnitAdapter['read']>>): SyncUnit {
  const files = [...payload.files].sort((a, b) => a.path.localeCompare(b.path))
  return {
    schema: payload.schema,
    hash: unitHash({ ...payload, files }),
    files,
  }
}

async function collectUnits(entries: SyncUnitAdapter[]): Promise<Record<string, SyncUnit>> {
  const units: Record<string, SyncUnit> = {}
  for (const entry of entries) {
    try {
      units[entry.id] = toSyncUnit(await entry.read())
    } catch (error) {
      throw new CloudError(
        'CLOUD_COLLECT_FAILED',
        `${entry.id} 读取失败：${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }
  return units
}

/**
 * 按 unit 独立成败地读本地（T-76③）。
 *
 * `collectUnits` 是全或无的：一个 unit 读失败就整批放弃。后台推送要的是"能推几条推几条"，
 * 否则一个坏 unit（动作仓库文件缺失、`sj_set.json` 不存在）会让其余几个永远推不上去。
 * 整包 `upload()` / `download()` 仍用全或无版本——那是用户在场的整包操作，半截成功更危险。
 */
async function collectUnitsTolerant(
  entries: SyncUnitAdapter[],
): Promise<{ units: Record<string, SyncUnit>; failed: { id: string; message: string }[] }> {
  const units: Record<string, SyncUnit> = {}
  const failed: { id: string; message: string }[] = []
  for (const entry of entries) {
    try {
      units[entry.id] = toSyncUnit(await entry.read())
    } catch (error) {
      failed.push({
        id: entry.id,
        message: error instanceof Error ? error.message : '未知错误',
      })
    }
  }
  return { units, failed }
}

function errorResult(error: unknown): { error: string; errorCode: string } {
  if (error instanceof CloudError) return { error: error.message, errorCode: error.code }
  return {
    error: error instanceof Error ? error.message : '云同步失败',
    errorCode: 'CLOUD_NETWORK',
  }
}

/** unit id → unit hash；台账的 per-unit 指纹 */
function unitHashes(units: Record<string, SyncUnit>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [id, unit] of Object.entries(units)) out[id] = unit.hash
  return out
}

export function createCloudEngine(deps: CloudDeps): CloudEngine {
  function getStatus(): CloudStatus {
    const ledger = deps.ledger.read()
    const pendingItems = deps.pending.list()
    return {
      configured: deps.config.isConfigured(),
      autoSyncEnabled: deps.config.isAutoSyncEnabled(),
      hasLedger: ledger !== null,
      rev: ledger?.rev ?? 0,
      syncedAt: ledger?.syncedAt ?? 0,
      localHash: ledger?.localHash ?? '',
      pending: pendingItems.length,
      // 明细给 UI 分原因显示（T-74）：一个数字分不出"未配置"和"冲突"
      pendingItems,
    }
  }

  async function upload(options: UploadOptions = {}): Promise<UploadResult> {
    if (!deps.config.isConfigured()) {
      return { ok: false, count: 0, error: '未配置同步地址', errorCode: 'CLOUD_NOT_CONFIGURED' }
    }

    let localUnits: Record<string, SyncUnit>
    try {
      localUnits = await collectUnits(deps.entries)
    } catch (error) {
      return { ok: false, count: 0, ...errorResult(error) }
    }

    const localHash = unitsHash(localUnits)
    const ledger = deps.ledger.read()

    let cloud
    try {
      cloud = await deps.transport.pull()
    } catch (error) {
      return { ok: false, count: 0, ...errorResult(error) }
    }

    const decision = decideUpload({
      cloudReadable: true,
      cloudExists: cloud !== null,
      cloudRev: cloud?.rev ?? 0,
      cloudUpdatedAt: cloud?.updatedAt ?? 0,
      ledger,
      localHash,
      cloudHash: cloud ? unitsHash(cloud.units) : '',
    })

    if (decision.inSync) return { ok: true, count: 0, skipped: true }
    if (decision.kind !== 'none' && !options.force) {
      if (!options.onConfirm) {
        return {
          ok: false,
          count: 0,
          cancelled: true,
          error: '需要确认云端冲突',
          errorCode: 'CLOUD_REV_CONFLICT',
        }
      }
      const confirmed = await options.onConfirm(decision)
      if (!confirmed) {
        return {
          ok: false,
          count: 0,
          cancelled: true,
          error: '取消操作',
          errorCode: 'CLOUD_CANCELLED',
        }
      }
    }

    const nextRev = Math.max(cloud?.rev ?? 0, 0) + 1
    const snapshot = buildSnapshot(localUnits, nextRev)

    try {
      await deps.transport.push(snapshot)
      deps.ledger.write({
        rev: nextRev,
        syncedAt: snapshot.updatedAt,
        localHash,
        units: unitHashes(localUnits),
      })
      // 整包上传成功 = 所有 unit 都已对齐，后台留下的待同步痕迹全部失效
      deps.pending.clear()
      return { ok: true, count: Object.keys(localUnits).length }
    } catch (error) {
      return { ok: false, count: 0, ...errorResult(error) }
    }
  }

  async function download(options: DownloadOptions = {}): Promise<DownloadResult> {
    if (!deps.config.isConfigured()) {
      return {
        ok: false,
        count: 0,
        hasCloud: false,
        error: '未配置同步地址',
        errorCode: 'CLOUD_NOT_CONFIGURED',
      }
    }

    let cloud
    try {
      cloud = await deps.transport.pull()
    } catch (error) {
      return { ok: false, count: 0, hasCloud: false, ...errorResult(error) }
    }

    if (!cloud) return { ok: false, count: 0, hasCloud: false, error: '云端没有数据' }

    let localUnits: Record<string, SyncUnit>
    try {
      localUnits = await collectUnits(deps.entries)
    } catch (error) {
      return { ok: false, count: 0, hasCloud: true, ...errorResult(error) }
    }

    const diff: SyncDiff = diffUnits(cloud.units, localUnits)
    if (diff.conflicts.length > 0) {
      if (!options.onConfirm) {
        return {
          ok: false,
          count: 0,
          hasCloud: true,
          cancelled: true,
          error: `有 ${diff.conflicts.length} 个同步项会被覆盖，需要确认`,
          errorCode: 'CLOUD_CANCELLED',
        }
      }
      const confirmed = await options.onConfirm(diff)
      if (!confirmed) {
        return { ok: false, count: 0, hasCloud: true, cancelled: true, error: '取消操作' }
      }
    }

    const adapters = adapterMap(deps.entries)
    const failed: string[] = []
    let written = 0

    for (const [id, unit] of Object.entries(cloud.units)) {
      const adapter = adapters.get(id)
      if (!adapter) {
        failed.push(`${id}（未注册）`)
        continue
      }

      const result: WriteOutcome = await adapter.write(unit)
      if (result.ok) written += 1
      else failed.push(`${id}（${result.message}）`)
    }

    if (failed.length > 0) {
      return {
        ok: false,
        count: written,
        hasCloud: true,
        partial: { failed },
        error: `部分同步项写回失败：${failed.join('、')}`,
        errorCode: 'CLOUD_WRITE_FAILED',
      }
    }

    try {
      deps.ledger.write({
        rev: cloud.rev,
        syncedAt: Date.now(),
        localHash: unitsHash(cloud.units),
        units: unitHashes(cloud.units),
      })
    } catch (error) {
      return { ok: false, count: written, hasCloud: true, ...errorResult(error) }
    }

    deps.pending.clear()
    return { ok: true, count: written, hasCloud: true }
  }

  /**
   * 按 unit 增量推送（T-55/T-56）。
   *
   * 依据（二手证据，`docs/生成/jsx返回结构复原.md` §3.2/§3.3）：原版 `0425.js:3469-3579`
   * 的 `pushFile` 是"按文件"推送；这里做到"按 unit"——一个 unit 就是一组文件，
   * unit 内仍整体替换。粒度差异是有意的：unit 内文件有先后依赖
   * （动作库索引必须最后写，见 `entries/action-library.ts`）。
   *
   * 冲突只按 unit 判：云端 rev 变新时，只有"上次同步后我们又改过"的 unit 才算冲突。
   * 否则别人改别的 unit 就会让本条永远静默 cancelled —— 这正是 T-55/T-56 要修的语义。
   */
  async function pushUnits(
    ids: string[],
    options: PushUnitsOptions = {},
  ): Promise<PushUnitsResult> {
    const wanted = [...new Set(ids.filter(Boolean))].sort()
    if (wanted.length === 0) return { ok: true, count: 0, pushed: [], skipped: true }

    if (!deps.config.isConfigured()) {
      // 不发请求：没有 endpoint，发出去只会是半截请求
      deps.pending.record(wanted, 'not-configured')
      return {
        ok: false,
        count: 0,
        pushed: [],
        pending: wanted,
        error: '未配置同步地址',
        errorCode: 'CLOUD_NOT_CONFIGURED',
      }
    }

    const adapters = adapterMap(deps.entries)
    const unknown = wanted.filter((id) => !adapters.has(id))
    if (unknown.length > 0) {
      return {
        ok: false,
        count: 0,
        pushed: [],
        error: `未注册的同步项：${unknown.join('、')}`,
        errorCode: 'CLOUD_COLLECT_FAILED',
      }
    }
    const targets = wanted
      .map((id) => adapters.get(id))
      .filter((adapter): adapter is SyncUnitAdapter => adapter !== undefined)

    // T-76③：逐 unit 读，单个读失败只把自己记成待同步，不拖死整批
    const collected = await collectUnitsTolerant(targets)
    const failedIds = collected.failed.map((item) => item.id)
    if (failedIds.length > 0) deps.pending.record(failedIds, 'collect-failed')

    const localUnits = collected.units
    const ready = wanted.filter((id) => localUnits[id] !== undefined)
    if (ready.length === 0) {
      return {
        ok: false,
        count: 0,
        pushed: [],
        pending: failedIds,
        error: `同步项读取失败：${collected.failed.map((f) => `${f.id}（${f.message}）`).join('、')}`,
        errorCode: 'CLOUD_COLLECT_FAILED',
      }
    }

    let cloud: CloudSnapshotView | null
    try {
      cloud = await deps.transport.pull()
    } catch (error) {
      deps.pending.record(ready, 'network')
      return { ok: false, count: 0, pushed: [], pending: ready, ...errorResult(error) }
    }

    const ledger = deps.ledger.read()
    const cloudUnits = cloud?.units ?? {}
    const changed = ready.filter((id) => cloudUnits[id]?.hash !== localUnits[id].hash)

    /**
     * 内容一致也要把 per-unit 基线刷新到「当前云端」（T-76②）。
     *
     * 不刷新的后果：基线停在上次推送时的旧值，本地之后真改了，三方比较会拿旧 base 算出
     * 「mineChanged && theirsChanged」→ 判成假冲突 → 该推的推不上去，之后每次都被拦住。
     *
     * 没有台账时不新建：`hasCloudLedger()` 是"新设备不自动覆盖云端"的护栏
     * （`src/cloud/auto-sync.ts:28`），不该被一次"内容恰好相同"顺手解除。
     * `syncedAt` 保持不动——本次没有数据真的同步过，它记的是"上次真正推成功的时间"。
     */
    function refreshBaseline(): void {
      if (!ledger) return
      const baseline: Record<string, string> = {}
      for (const id of ready) {
        const hash = cloudUnits[id]?.hash ?? localUnits[id].hash
        if (hash) baseline[id] = hash
      }
      deps.ledger.write({
        rev: Math.max(cloud?.rev ?? 0, ledger.rev),
        syncedAt: ledger.syncedAt,
        // 与推送路径同一语义：upload() 的 inSync 判定读的就是这个字段
        localHash: unitsHash(cloudUnits),
        units: { ...(ledger.units ?? {}), ...baseline },
      })
    }

    if (changed.length === 0) {
      refreshBaseline()
      return {
        ok: true,
        count: 0,
        pushed: [],
        skipped: true,
        ...(failedIds.length > 0 ? { pending: failedIds } : {}),
      }
    }

    /**
     * 三方比较：base = 台账里这一条上次同步时的指纹，mine = 本地，theirs = 云端。
     * 只有「两边相对 base 都改过」才算冲突——别人改别的 unit、或者云端这一条根本没动，
     * 都不该拦住我们的推送（否则后台推送会永远静默 cancelled，见 T-55/T-56 说明）。
     */
    const conflicts = changed.filter((id) => {
      const base = ledger?.units?.[id]
      // T-76①：没有 per-unit 基线（老台账 / 首次推送）**不能**判成冲突。
      // 判冲突的后果是首推永远 cancelled，启动补偿跑一次就死在这里。
      // 按"新增"处理：本地是唯一真相，推上去并在下面一次写入基线。
      if (!base) return false
      const mineChanged = base !== localUnits[id].hash
      const theirsChanged = base !== (cloudUnits[id]?.hash ?? '')
      return mineChanged && theirsChanged
    })

    if (conflicts.length > 0 && !options.force) {
      if (!options.onConfirm) {
        deps.pending.record(conflicts, 'conflict')
        return {
          ok: false,
          count: 0,
          pushed: [],
          pending: conflicts,
          cancelled: true,
          error: `云端有更新的版本（rev ${cloud?.rev ?? 0}），${conflicts.join('、')} 未推送`,
          errorCode: 'CLOUD_REV_CONFLICT',
        }
      }
      const confirmed = await options.onConfirm({ units: conflicts, cloudRev: cloud?.rev ?? 0 })
      if (!confirmed) {
        deps.pending.record(conflicts, 'conflict')
        return {
          ok: false,
          count: 0,
          pushed: [],
          pending: conflicts,
          cancelled: true,
          error: '取消操作',
          errorCode: 'CLOUD_CANCELLED',
        }
      }
    }

    // UNVERIFIED(T-55/T-56)：云端为空时这里只推"被请求的 unit"，云端会是一份
    // 局部快照（其它 unit 缺席）。同一账号的另一台机器此时 download 会看到
    // 缺项——真实客户端混用场景无法在本地验证，靠后续整包 upload 收敛。
    const merged: Record<string, SyncUnit> = { ...cloudUnits }
    for (const id of changed) merged[id] = localUnits[id]

    const nextRev = Math.max(cloud?.rev ?? 0, ledger?.rev ?? 0) + 1
    const snapshot = buildSnapshot(merged, nextRev)

    try {
      await deps.transport.push(snapshot)
    } catch (error) {
      deps.pending.record(changed, 'network')
      return { ok: false, count: 0, pushed: [], pending: changed, ...errorResult(error) }
    }

    try {
      deps.ledger.write({
        rev: nextRev,
        syncedAt: snapshot.updatedAt,
        // 必须是"合并后全量"的 hash：upload() 的 inSync 判定读的就是这个字段
        localHash: unitsHash(merged),
        units: unitHashes(merged),
      })
    } catch (error) {
      return { ok: false, count: changed.length, pushed: changed, ...errorResult(error) }
    }

    // 只清"这次真的对齐了"的 unit：读失败的那些刚记进 pending，清掉就等于把痕迹抹了
    deps.pending.clear(ready)
    return {
      ok: true,
      count: changed.length,
      pushed: changed,
      rev: nextRev,
      ...(failedIds.length > 0 ? { pending: failedIds } : {}),
    }
  }

  return { getStatus, upload, download, pushUnits }
}
