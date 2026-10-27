import { md5 } from '@/utils/md5'
import { isDecodeFail, shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'
import { isRecord } from '@/utils/guards'
import type { Exists } from '@/utils/exists'

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
  /**
   * 这个同步项的**本地触发源**：仓库写成功后回调 `markDirty()`，返回取消订阅。
   *
   * 必填是判据，不是形式：触发源必须声明在各 unit 的 adapter 上，否则漏订阅会静默不标脏、
   * 不自动同步、也不报错。并到 adapter 上之后，**漏声明 = `npm run typecheck` 不过**，
   * 新增同步项不可能再静默漏订阅。
   *
   * 订阅是"全局只做一次"的装配动作，只许 `cep/cloud/change-sync.ts` 遍历调用。
   */
  watch(markDirty: () => void): () => void
}

export type WriteOutcome = { status: 'ok' } | { status: 'error'; reason: string }

/**
 * `WriteOutcome` 失败臂的**唯一构造点**。
 *
 * 每个 adapter 各写一遍 `{ status: 'error', reason }` 就是五个构造点 —— 加字段时要改五处，
 * 漏一处**不会报错**（`reason` 还在，新字段悄悄成了可选）。
 */
export function writeFailed(reason: string): WriteOutcome {
  return { status: 'error', reason }
}

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
  /** 权限（HTTP 401/403 或 GAS 的登录页）：**不会自己好**，重试只是刷日志 */
  | 'CLOUD_PERMISSION'
  /** 限流（HTTP 429）：会好，但要慢——退避直接跳到最长一档 */
  | 'CLOUD_RATE_LIMITED'
  | 'CLOUD_BAD_RESPONSE'
  | 'CLOUD_COLLECT_FAILED'
  | 'CLOUD_WRITE_FAILED'
  | 'CLOUD_REV_CONFLICT'
  | 'CLOUD_CANCELLED'

export class CloudError extends Error {
  readonly code: CloudErrorCode
  /**
   * **技术原文**：系统 / 网络 / 宿主给的原因，只进日志，不进用户文案。
   *
   * 与 `CepError.cause` 同一分工。自己赋值而不是 `super(message, { cause })`：
   * `Error` 的第二参是 Chrome 93+ 才有的，CEP 的 Chromium 更老，传了会被静默丢掉。
   */
  override readonly cause?: unknown

  constructor(code: CloudErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'CloudError'
    this.code = code
    this.cause = cause
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

/**
 * 文本的**UTF-8 字节数**。
 *
 * 以前是 `try { TextEncoder… } catch { data.length }`：兜底那句把**字符数当字节数**，
 * 一个汉字 3 字节却只记 1，同步快照里的 `size` 从此偏小且无人知道（潜伏型）。
 * 现在没有兜底：`TextEncoder` 在两个运行环境（Node / CEP 的 Chromium）都有，
 * 真没有就抛——宁可炸一次，也不要静默算错。
 */
export function fileByteSize(data: string): number {
  return new TextEncoder().encode(data).length
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

function normalizeUnit(raw: unknown): Decoded<SyncUnit> | DecodeFail {
  if (!isRecord(raw)) return shapeFail('', 'object', raw)
  const unit = raw
  if (!Array.isArray(unit.files)) return shapeFail('files', 'array', unit.files)

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
    value: {
      schema: typeof unit.schema === 'number' ? unit.schema : 1,
      hash: typeof unit.hash === 'string' ? unit.hash : '',
      files,
    },
  }
}

/**
 * 云端快照读取的**三态**（与 `LedgerRead` 同形：观测，不是结论）。
 *
 * 为什么必须三态：两态（`| null`）里"读不懂"与"没有"同值
 * 引擎据此判"云端是空的"，用本地 rev=1 把云端覆盖掉 —— 用户看到的是一次**成功**同步。
 * 网关回 200 但结构不符（错误页 / `{ok:true}` / 字段改名）恰恰走这条路。
 *
 * - `ok`：读到了快照（`units` 可以是空对象 = 云端有记录但还没有内容，这是合法快照）；
 * - `empty`：服务端**明确**说"还没有数据"（`{data:null}` 或整体 `null`）——
 *   只有显式声明才算，**不靠"没看到 units"倒推**；
 * - `unreadable`：回包结构不符（含坏 unit）→ 调用方必须**拒绝写云端**。
 */
export type CloudPullOutcome = Exists<CloudSnapshotView>

/** 给 `reason` 用的一句话形状描述（不抛、不猜）—— 只进日志与失败提示，不是用户话 */
function describeShape(raw: unknown): string {
  if (raw === undefined) return 'undefined'
  if (raw === null) return 'null'
  if (Array.isArray(raw)) return 'array'
  return typeof raw === 'object' ? `object{${Object.keys(raw as object).join(',')}}` : typeof raw
}

/**
 * 兼容：
 * A. { data: CloudSnapshot }
 * B. CloudSnapshot 裸包
 *
 * **读不懂 ≠ 没有**：只有 `{data:null}` / 整体 `null` 才算 `empty`；
 * 缺 `units`、unit 坏掉、回包不是对象一律 `unreadable`（调用方据此拒绝覆盖云端）。
 */
export function normalizeCloudPayload(raw: unknown): CloudPullOutcome {
  // 1. 显式的"没有"：服务端把 data 置 null（唯一能证明"没有"的信号）
  if (raw === null || raw === undefined) return { status: 'notSeen' }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { status: 'error', fail: 'badShape', reason: `回包不是对象（${describeShape(raw)}）` }
  }
  const outer = raw as Record<string, unknown>
  if ('data' in outer && outer.data === null) return { status: 'notSeen' }

  const candidate =
    outer.data && typeof outer.data === 'object' && !Array.isArray(outer.data)
      ? (outer.data as Record<string, unknown>)
      : outer

  if (!candidate.units || typeof candidate.units !== 'object' || Array.isArray(candidate.units)) {
    // 这里以前 return null = "云端是空的"。`{ok:true}` 这类回包正好落进来，
    // 于是引擎拿 rev=1 覆盖云端。
    return {
      status: 'error',
      fail: 'badShape',
      reason: `回包没有 units，且没明说"没有"（${describeShape(raw)}）`,
    }
  }

  const units: Record<string, SyncUnit> = {}
  const dropped: string[] = []
  for (const [id, value] of Object.entries(candidate.units as Record<string, unknown>)) {
    const unit = normalizeUnit(value)
    // 坏 unit 不许静默丢弃：丢掉它 = 下一次 push 的整包会**少一个 unit**，
    // 云端那份就被我们这次写入抹掉了（同一条母体）。所以这里记 key，整份判 unreadable。
    if (isDecodeFail(unit)) dropped.push(id)
    else units[id] = unit.value
  }
  if (dropped.length) {
    return {
      status: 'error',
      fail: 'badShape',
      reason: `云端有读不懂的 unit：${dropped.join('、')}`,
    }
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

  return { status: 'ok', value: { rev, updatedAt, units, raw: snapshot } }
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
