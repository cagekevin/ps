import { md5 } from '@/utils/md5'

export type FileEncoding = 'json' | 'text' | 'base64'

export type FileContent =
  | {
      kind: 'inline'
      data: string
      encoding: FileEncoding
    }
  | {
      kind: 'remote'
      sha: string
      size: number
      encoding: FileEncoding
    }

export interface SyncFile {
  path: string
  size: number
  content: FileContent
}

export interface SyncUnit {
  /** unit 数据结构版本，用于迁移 */
  schema: number
  /** unit 内容指纹，不参与安全用途 */
  hash: string
  files: SyncFile[]
}

export interface CloudSnapshot {
  type: 'psz_sync'
  schema: 1
  rev: number
  updatedAt: number
  units: Record<string, SyncUnit>
  __meta?: {
    rev: number
    updatedAt: number
    schema: 1
  }
}

export interface CloudSnapshotView {
  rev: number
  updatedAt: number
  units: Record<string, SyncUnit>
  raw: CloudSnapshot
}

export interface UnitPayload {
  schema: number
  files: SyncFile[]
}

export interface SyncUnitAdapter {
  id: string
  schema: number
  read(): Promise<UnitPayload>
  write(payload: UnitPayload): Promise<WriteOutcome>
}

export type WriteOutcome = { ok: true } | { ok: false; message: string }

export type UploadConflictKind = 'none' | 'cloud-newer' | 'both-changed' | 'cloud-unknown'

export interface UploadDecision {
  kind: UploadConflictKind
  cloudRev: number
  cloudUpdatedAt: number
  ledgerRev: number | null
  localDirty: boolean
  inSync: boolean
}

export interface SyncDiff {
  conflicts: string[]
  cloudOnly: string[]
  localOnly: string[]
}

export interface CloudLedger {
  rev: number
  syncedAt: number
  localHash: string
}

export type CloudErrorCode =
  | 'CLOUD_NOT_CONFIGURED'
  | 'CLOUD_NETWORK'
  | 'CLOUD_PERMISSION_HTML'
  | 'CLOUD_BAD_RESPONSE'
  | 'CLOUD_COLLECT_FAILED'
  | 'CLOUD_WRITE_FAILED'
  | 'CLOUD_REV_CONFLICT'
  | 'CLOUD_CANCELLED'

export class CloudError extends Error {
  readonly code: CloudErrorCode

  constructor(code: CloudErrorCode, message: string) {
    super(message)
    this.name = 'CloudError'
    this.code = code
  }
}

function toPositiveInt(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function toTimestamp(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** 键序稳定；数组顺序保留 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`
}

export function contentHash(value: unknown): string {
  return md5(stableStringify(value))
}

export function fileByteSize(data: string): number {
  try {
    return new TextEncoder().encode(data).length
  } catch {
    return data.length
  }
}

export function unitHash(payload: Pick<UnitPayload, 'schema' | 'files'>): string {
  return contentHash({
    schema: payload.schema,
    files: payload.files,
  })
}

export function unitsHash(units: Record<string, SyncUnit>): string {
  return contentHash({ units })
}

function normalizeUnit(raw: unknown): SyncUnit | null {
  if (!raw || typeof raw !== 'object') return null
  const unit = raw as Record<string, unknown>
  if (!Array.isArray(unit.files)) return null

  const files: SyncFile[] = []
  for (const file of unit.files) {
    if (!file || typeof file !== 'object') continue
    const f = file as Record<string, unknown>
    if (typeof f.path !== 'string' || !f.path) continue
    if (!f.content || typeof f.content !== 'object') continue
    const content = f.content as Record<string, unknown>
    if (content.kind === 'inline') {
      if (typeof content.data !== 'string') continue
      files.push({
        path: f.path,
        size: typeof f.size === 'number' ? f.size : fileByteSize(content.data),
        content: {
          kind: 'inline',
          data: content.data,
          encoding:
            content.encoding === 'base64'
              ? 'base64'
              : content.encoding === 'text'
                ? 'text'
                : 'json',
        },
      })
    } else if (content.kind === 'remote') {
      if (typeof content.sha !== 'string' || typeof content.size !== 'number') continue
      files.push({
        path: f.path,
        size: typeof f.size === 'number' ? f.size : content.size,
        content: {
          kind: 'remote',
          sha: content.sha,
          size: content.size,
          encoding:
            content.encoding === 'base64'
              ? 'base64'
              : content.encoding === 'text'
                ? 'text'
                : 'json',
        },
      })
    }
  }

  return {
    schema: typeof unit.schema === 'number' ? unit.schema : 1,
    hash: typeof unit.hash === 'string' ? unit.hash : '',
    files,
  }
}

/**
 * 兼容：
 * A. { data: CloudSnapshot }
 * B. CloudSnapshot 裸包
 * 无有效 units → null。
 */
export function normalizeCloudPayload(raw: unknown): CloudSnapshotView | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const outer = raw as Record<string, unknown>
  const candidate =
    outer.data && typeof outer.data === 'object' && !Array.isArray(outer.data)
      ? (outer.data as Record<string, unknown>)
      : outer

  if (!candidate.units || typeof candidate.units !== 'object' || Array.isArray(candidate.units)) {
    return null
  }

  const units: Record<string, SyncUnit> = {}
  for (const [id, value] of Object.entries(candidate.units as Record<string, unknown>)) {
    const unit = normalizeUnit(value)
    if (unit) units[id] = unit
  }

  const meta =
    candidate.__meta && typeof candidate.__meta === 'object'
      ? (candidate.__meta as Record<string, unknown>)
      : {}
  const rev = toPositiveInt(candidate.rev ?? meta.rev ?? outer.rev)
  const updatedAt = toTimestamp(candidate.updatedAt ?? meta.updatedAt ?? outer.updatedAt)

  const snapshot: CloudSnapshot = {
    type: 'psz_sync',
    schema: 1,
    rev,
    updatedAt,
    units,
    __meta: { rev, updatedAt, schema: 1 },
  }

  return { rev, updatedAt, units, raw: snapshot }
}

export function buildSnapshot(
  units: Record<string, SyncUnit>,
  rev: number,
  updatedAt = Date.now(),
): CloudSnapshot {
  return {
    type: 'psz_sync',
    schema: 1,
    rev: toPositiveInt(rev) || 1,
    updatedAt,
    units,
    __meta: { rev: toPositiveInt(rev) || 1, updatedAt, schema: 1 },
  }
}

export function decideUpload(input: {
  cloudReadable: boolean
  cloudExists: boolean
  cloudRev: number
  cloudUpdatedAt: number
  ledger: CloudLedger | null
  localHash: string
  cloudHash?: string
}): UploadDecision {
  const localDirty = !input.ledger || input.ledger.localHash !== input.localHash
  const inSync = !!input.cloudHash && input.cloudHash === input.localHash
  const base: UploadDecision = {
    kind: 'none',
    cloudRev: input.cloudRev,
    cloudUpdatedAt: input.cloudUpdatedAt,
    ledgerRev: input.ledger?.rev ?? null,
    localDirty,
    inSync,
  }

  if (!input.cloudReadable) return { ...base, kind: 'cloud-unknown' }
  if (inSync) return base
  if (!input.cloudExists) return base
  if (!input.ledger) return { ...base, kind: 'cloud-newer' }
  if (input.cloudRev > input.ledger.rev) {
    return { ...base, kind: localDirty ? 'both-changed' : 'cloud-newer' }
  }
  return base
}

export function diffUnits(
  cloud: Record<string, SyncUnit>,
  local: Record<string, SyncUnit>,
): SyncDiff {
  const conflicts: string[] = []
  const cloudOnly: string[] = []
  const localOnly: string[] = []
  const ids = new Set([...Object.keys(cloud), ...Object.keys(local)])

  for (const id of [...ids].sort()) {
    const c = cloud[id]
    const l = local[id]
    if (c && !l) cloudOnly.push(id)
    else if (!c && l) localOnly.push(id)
    else if (c && l && c.hash !== l.hash) conflicts.push(id)
  }

  return { conflicts, cloudOnly, localOnly }
}
