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
  UploadOptions,
  UploadResult,
} from './types'

export interface CloudEngine {
  getStatus(): CloudStatus
  upload(options?: UploadOptions): Promise<UploadResult>
  download(options?: DownloadOptions): Promise<DownloadResult>
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
      })
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
      })
    } catch (error) {
      return { ok: false, count: written, hasCloud: true, ...errorResult(error) }
    }

    return { ok: true, count: written, hasCloud: true }
  }

  return { getStatus, upload, download }
}
