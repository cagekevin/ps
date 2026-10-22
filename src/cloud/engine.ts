import {
  CloudError,
  buildSnapshot,
  decideUpload,
  diffUnits,
  unitHash,
  unitsHash,
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
    return {
      configured: deps.config.isConfigured(),
      autoSyncEnabled: deps.config.isAutoSyncEnabled(),
      hasLedger: ledger !== null,
      rev: ledger?.rev ?? 0,
      syncedAt: ledger?.syncedAt ?? 0,
      localHash: ledger?.localHash ?? '',
      pending: deps.pending.list().length,
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

    let localUnits: Record<string, SyncUnit>
    try {
      localUnits = await collectUnits(targets)
    } catch (error) {
      deps.pending.record(wanted, 'collect-failed')
      return { ok: false, count: 0, pushed: [], pending: wanted, ...errorResult(error) }
    }

    let cloud
    try {
      cloud = await deps.transport.pull()
    } catch (error) {
      deps.pending.record(wanted, 'network')
      return { ok: false, count: 0, pushed: [], pending: wanted, ...errorResult(error) }
    }

    const ledger = deps.ledger.read()
    const cloudUnits = cloud?.units ?? {}
    const changed = wanted.filter((id) => cloudUnits[id]?.hash !== localUnits[id].hash)

    // 云端已经一致：不 push、不写台账（与 upload 的"内容一致就跳过"同一语义）
    if (changed.length === 0) return { ok: true, count: 0, pushed: [], skipped: true }

    /**
     * 三方比较：base = 台账里这一条上次同步时的指纹，mine = 本地，theirs = 云端。
     * 只有「两边相对 base 都改过」才算冲突——别人改别的 unit、或者云端这一条根本没动，
     * 都不该拦住我们的推送（否则后台推送会永远静默 cancelled，见 T-55/T-56 说明）。
     */
    const conflicts = changed.filter((id) => {
      const base = ledger?.units?.[id]
      if (!base) return true // 没有 per-unit 基线（老台账 / 首次推送）：无法判断，交给确认
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
    // 缺项——真实客户端混用场景无法在本机验证，靠后续整包 upload 收敛。
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

    deps.pending.clear(wanted)
    return { ok: true, count: changed.length, pushed: changed, rev: nextRev }
  }

  return { getStatus, upload, download, pushUnits }
}
