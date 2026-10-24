import type {
  CloudLedger,
  CloudSnapshot,
  CloudPullOutcome,
  SyncUnitAdapter,
  SyncDiff,
  UploadDecision,
} from '@/domain/cloud'

export interface CloudTransportPort {
  push(snapshot: CloudSnapshot): Promise<void>
  /** 三态：`ok` 有快照 / `empty` 服务端明说没有 / `unreadable` 读不懂（调用方必须拒绝写云端） */
  pull(): Promise<CloudPullOutcome>
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

/**
 * 台账读取的**三态**。
 *
 * **"读不到" ≠ "没有"**（T-114）：坏台账曾被读成"没有台账"，于是
 * `decideUpload` 判成 `cloud-newer`、`gate()` 报 `CLOUD_NO_LEDGER`，
 * 而设置页显示的是"本地还没有同步记录，先点「从云端拉取」"——用户可能据此
 * 点「上传」，把云端那一份覆盖掉。三态把这两件事分开，`broken` 一律**拒绝上传**。
 */
export type LedgerRead =
  | { status: 'ok'; ledger: CloudLedgerRecord }
  | { status: 'none' }
  | { status: 'broken'; reason: string }

export interface CloudLedgerPort {
  read(): Promise<LedgerRead>
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
  /**
   * 具体错误码（如 `CLOUD_PERMISSION` / `CLOUD_OFFLINE` / `CLOUD_RATE_LIMITED`，TD-11-8）。
   *
   * 为什么不直接多几个 `reason` 桶：`reason` 是"用户该做什么"的粗分类，页面按它选文案；
   * 错误码是"技术上到底怎么了"，给日志与后续按码做不同处理用。两者维度不同，
   * 硬塞进一个字段会让五桶变成十几桶，而 `PendingReason` 的每个成员都必须有专属文案。
   */
  code?: string
}

export interface CloudPendingPort {
  /** `code` 给得出就带上：日志和状态里能看出"是哪一类失败"，而不只是"失败了" */
  record(units: string[], reason: PendingReason, code?: string): void
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
  /**
   * 台账的**三态**（T-114）。
   *
   * 以前这里是一个 `hasLedger: boolean` + 三个扁平字段（`rev` / `syncedAt` / `localHash`），
   * 于是"读不到"只能伪装成"没有"：`hasLedger:false` / `rev:0`。设置页据此显示
   * "本地还没有同步记录，先点「从云端拉取」"——用户可能点「上传」把云端覆盖掉。
   *
   * 现在判别位是 `ledgerState.status`；`rev` / `syncedAt` / `localHash` 只在该值为 `ok` 时有意义。
   */
  ledgerState: LedgerRead
  rev: number
  syncedAt: number
  localHash: string
  /** 待同步的 unit 数（未配置 / 冲突 / 网络失败累计），0 表示没有痕迹 */
  pending: number
  /**
   * 上述痕迹的明细（每条带 reason，T-74）。
   *
   * 为什么把明细也放进来：`pending` 一个数字分不出"未配置"和"冲突"，
   * 而这两件事用户该做的完全不同（去填地址 / 决定保留哪边）——文案必须能分开。
   * 数量上限 32（`cep/cloud/pending.ts:13`），随状态一起读没有额外成本。
   */
  pendingItems: PendingChange[]
}

/** `CloudStatus` 的空值：store 初始化用（真正的值要 `await getStatus()` 才有） */
export function emptyCloudStatus(): CloudStatus {
  return {
    configured: false,
    autoSyncEnabled: false,
    ledgerState: { status: 'none' },
    rev: 0,
    syncedAt: 0,
    localHash: '',
    pending: 0,
    pendingItems: [],
  }
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
