// 是什么：云同步的端口类型 + 唯一失败形状（`CloudFailure`）+ 它的唯一渲染器
// 唯一入口：`describeCloudFailure` 是 `CloudFailure` → 一行技术诊断的**唯一**处（给日志 / 报表）
// 谁在用：`cloud/engine` · `cep/cloud/*` · `pages/set/cloud-status`
// 禁止：用户面不要用 `describeCloudFailure`（它带码前缀）—— 用户文案取 `reason ?? fail`；
//   也不在这里拼 `DecodeFail` 的文案（那是 `repo-read.describeDecodeFail`）。

import type {
  CloudLedger,
  CloudSnapshot,
  CloudPullOutcome,
  SyncUnitAdapter,
  SyncDiff,
  UploadDecision,
} from '@/domain/cloud'
import type { Exists } from '@/utils/exists'

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
/**
 * 台账的**三态**：有 / 没有 / 坏了。
 *
 * 与系统字体、云端快照同一个形状（`Exists<T>`）—— 三者都在答"有没有这份数据"。
 * 不许写成 `{ status:'broken'; reason: string }`：那个 `reason` 会变成 `msg` 拼的用户文案，
 * 上游把它当"底层原话"传下去，等于 UI 文案冒充技术原因。
 */
export type LedgerRead = Exists<CloudLedgerRecord>

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
   * 具体错误码（如 `CLOUD_PERMISSION` / `CLOUD_OFFLINE` / `CLOUD_RATE_LIMITED`）。
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
    ledgerState: { status: 'notSeen' },
    rev: 0,
    syncedAt: 0,
    localHash: '',
    pending: 0,
    pendingItems: [],
  }
}

/**
 * 云操作失败的**唯一形状**：码 + 原因原文。
 *
 * 生产者不写用户话（判据 3）：用户看到的那句话由 `msg` 渲染，`reason` 只带底层原话。
 */
export interface CloudFailure {
  /** `CLOUD_*` 或 `CepError.code` */
  fail: string
  /**
   * **给用户看的那句话**：底层原话原样带出，不加工、不翻译（与 `RepoReadBad.reason` 同一语义）。
   *
   * **没有原话就不写这个字段**：把码复制进 `reason`（`{ fail: 'CLOUD_OFFLINE', reason: 'CLOUD_OFFLINE' }`）
   * 是同一个值写两遍，读的人分不清"没有原话"还是"原话恰好长这样"。
   */
  reason?: string
}

/**
 * 失败变成**一行技术诊断**（给日志 / 报表，**不是**用户文案）。
 *
 * 唯一渲染处：有系统原话就带出来，没有就只报码 —— 不许各调用点自己写
 * `${fail} · ${reason}`，那样 `reason` 一缺就打出 `undefined`。
 */
export function describeCloudFailure(f: CloudFailure): string {
  return f.reason ? `${f.fail}：${f.reason}` : f.fail
}

/**
 * 一次云操作的**唯一结果形状**（上传 / 下载 / 按 unit 推送共用）。
 *
 * 判别位是 `status`，取值来自同一张词表：`ok` / `skipped` / `cancelled` / `error`。
 * 失败臂**取不到**任何业务字段；「跳过」与「取消」各自成臂 —— 它们不是失败，
 * 混进 `ok: false` 就只能靠 `cancelled?: boolean` / `skipped?: boolean` 猜。
 */
export type CloudOutcome =
  | { status: 'ok' }
  /**
   * 什么都没做，也**不算失败**（不消耗退避）。`failure` 只用来记录"为什么跳过"：
   * 云端已一致 / 自动同步关 / 没有台账 / 离线 / 未配置。
   */
  | { status: 'skipped'; failure: CloudFailure }
  | { status: 'cancelled'; failure: CloudFailure }
  | { status: 'error'; failure: CloudFailure }

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

/** 按 unit 推送的结果 = 同一个 `CloudOutcome`（旧的 `pushed`/`rev`/`pending` 字段已删，无人读）。 */
export type PushUnitsResult = CloudOutcome
