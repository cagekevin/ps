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

export interface CloudLedgerPort {
  read(): CloudLedger | null
  write(ledger: CloudLedger): void
}

export interface CloudConfigPort {
  isConfigured(): boolean
  isAutoSyncEnabled(): boolean
}

export interface CloudDeps {
  transport: CloudTransportPort
  ledger: CloudLedgerPort
  config: CloudConfigPort
  entries: SyncUnitAdapter[]
}

export interface CloudStatus {
  configured: boolean
  autoSyncEnabled: boolean
  hasLedger: boolean
  rev: number
  syncedAt: number
  localHash: string
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
