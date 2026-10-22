import type {
  CloudLedger,
  CloudSnapshot,
  CloudSnapshotView,
  SyncUnitAdapter,
  SyncDiff,
  UploadDecision,
} from '@/domain/cloud'

export interface CloudTransportPort {
  push(snapshot: CloudSnapshot): Promise<void>
  pull(): Promise<CloudSnapshotView | null>
}

/**
 * 台账记录 = domain 的 `CloudLedger` + per-unit 指纹（T-55/T-56）。
 *
 * 为什么要 per-unit：整包 hash 会把"别人改了别的 unit"变成"我也冲突"，
 * 后台推送没有用户可确认，结果就是自己的改动永远上不去。
 *
 * 为什么不在 `domain/cloud.ts` 里加字段：本次改动边界只到 `src/cloud` 与
 * `src/cep/cloud`，domain 层不动；扩展字段只出现在端口层，读写实现在
 * `cep/cloud/ledger.ts`。老台账（只有 `localHash`）仍然可读，见该文件的兼容处理。
 */
export interface CloudLedgerRecord extends CloudLedger {
  /** unit id → unit hash；缺省 = 老台账，没有 per-unit 依据 */
  units?: Record<string, string>
}

export interface CloudLedgerPort {
  read(): CloudLedgerRecord | null
  write(ledger: CloudLedgerRecord): void
}

export interface CloudConfigPort {
  isConfigured(): boolean
  isAutoSyncEnabled(): boolean
}

/**
 * 后台推送失败/被跳过的痕迹。
 *
 * 为什么要落盘：后台推送没有用户在场，"改了没同步"如果只活在这个进程里，
 * 关掉面板就查不到了。见 `cep/cloud/pending.ts`。
 */
export type PendingReason =
  'not-configured' | 'no-cloud' | 'conflict' | 'network' | 'collect-failed'

export interface PendingChange {
  unit: string
  /** 最近一次记为待同步的时间戳 */
  at: number
  reason: PendingReason
}

export interface CloudPendingPort {
  record(units: string[], reason: PendingReason): void
  list(): PendingChange[]
  /** 不传 = 全清（整包上传/下载成功后所有 unit 都已对齐） */
  clear(units?: string[]): void
}

export interface CloudDeps {
  transport: CloudTransportPort
  ledger: CloudLedgerPort
  config: CloudConfigPort
  pending: CloudPendingPort
  entries: SyncUnitAdapter[]
}

export interface CloudStatus {
  configured: boolean
  autoSyncEnabled: boolean
  hasLedger: boolean
  rev: number
  syncedAt: number
  localHash: string
  /** 待同步的 unit 数（未配置 / 冲突 / 网络失败累计），0 表示没有痕迹 */
  pending: number
}

export interface UploadResult {
  ok: boolean
  count: number
  skipped?: boolean
  cancelled?: boolean
  error?: string
  errorCode?: string
}

export interface DownloadResult {
  ok: boolean
  count: number
  hasCloud: boolean
  cancelled?: boolean
  partial?: { failed: string[] }
  error?: string
  errorCode?: string
}

export interface UploadOptions {
  force?: boolean
  onConfirm?: (decision: UploadDecision) => Promise<boolean>
}

export interface DownloadOptions {
  onConfirm?: (diff: SyncDiff) => Promise<boolean>
}

/** 按 unit 推送时真正需要用户决定的部分：哪个 unit、云端 rev 多少 */
export interface PushUnitsConflict {
  units: string[]
  cloudRev: number
}

export interface PushUnitsOptions {
  force?: boolean
  onConfirm?: (conflict: PushUnitsConflict) => Promise<boolean>
}

export interface PushUnitsResult {
  ok: boolean
  /** 实际推送的 unit 数（内容一致时为 0） */
  count: number
  /** 本次推送涉及的 unit id */
  pushed: string[]
  /** 推送后的云端 rev；跳过或失败时不带 */
  rev?: number
  /** 云端内容已经一致，什么都没做 */
  skipped?: boolean
  /** 冲突未确认 / 用户取消 */
  cancelled?: boolean
  /** 记为待同步的 unit（未配置 / 冲突 / 网络失败） */
  pending?: string[]
  error?: string
  errorCode?: string
}
