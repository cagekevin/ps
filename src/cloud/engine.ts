import {
  CloudError,
  buildSnapshot,
  decideUpload,
  diffUnits,
  unitHash,
  unitsHash,
  type CloudPullOutcome,
  type CloudSnapshotView,
  type SyncDiff,
  type SyncUnit,
  type SyncUnitAdapter,
  type WriteOutcome,
} from '@/domain/cloud'
import type {
  CloudDeps,
  CloudFailure,
  CloudOutcome,
  CloudPendingPort,
  CloudStatus,
  DownloadOptions,
  LedgerBrokenFail,
  PushUnitsOptions,
  UploadOptions,
} from './types'
import { describeReadFailure } from '@/cep/fs-read'

export interface CloudEngine {
  /** T-114：台账读取改成三态后要 await（坏台账必须能被区分出来，见 `CloudStatus.ledgerBroken`） */
  getStatus(): Promise<CloudStatus>
  upload(options?: UploadOptions): Promise<CloudOutcome>
  download(options?: DownloadOptions): Promise<CloudOutcome>
  /**
   * 按 unit 增量推送（T-55/T-56）：pull → 只重算并替换指定 unit → push rev+1 → 写台账。
   *
   * 与 `upload()` 的分工：`upload` 是用户在设置页显式发起的整包同步（可弹冲突确认），
   * `pushUnits` 是后台跟随本地改动触发的局部推送（没有用户在场，冲突只能记痕迹）。
   */
  pushUnits(ids: string[], options?: PushUnitsOptions): Promise<CloudOutcome>
}

/**
 * "云端读不懂"的唯一处置：**拒绝写云端**。
 *
 * 为什么不退一步当"云端为空"继续推：那样 rev 从 1 起算，用户看到的是**一次成功同步**，
 * 而云端原来那份已经被覆盖掉了 —— 不可恢复。宁可这次不同步、把原因交上去。
 */
/** 云端读不懂：reason 就是底层那句（不再包一层"已拒绝覆盖云端"） */
function cloudUnreadable(reason: string): CloudFailure {
  return { fail: 'CLOUD_BAD_RESPONSE', reason }
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
        entry.id + ': ' + (error instanceof Error ? error.message : String(error)),
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
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return { units, failed }
}

function errorResult(error: unknown): CloudFailure {
  if (error instanceof CloudError) return { fail: error.code, reason: error.message }
  return { fail: 'CLOUD_NETWORK', reason: error instanceof Error ? error.message : String(error) }
}

/**
 * 记一条"网络类"待同步痕迹，并带上具体错误码。
 *
 * 为什么要码：`pending` 只有 5 个 reason 桶，"网络失败"里混着限流/权限/超时，
 * 日志和状态里看不出该做什么。码只在给得出的时候带，老调用处/老痕迹的写法不变。
 */
function recordNetworkPending(port: CloudPendingPort, units: string[], error: unknown): void {
  const code = error instanceof CloudError ? error.code : undefined
  if (code) port.record(units, 'network', code)
  else port.record(units, 'network')
}

/**
 * 坏台账的统一拒绝结果（T-114）。
 *
 * 为什么不按 `cloud-newer` 处理：那是"云端比我们新"的**结论**，而台账读不到时我们
 * **没有任何依据**下这个结论。用户会照着错误的原因确认，把云端覆盖掉。
 * 也不按"首次同步"处理：那是"从来没有台账"，会解除"新设备不覆盖云端"的护栏。
 */
/**
 * 台账读不到：读盘失败带**系统原话**（`EPERM: …`），内容失败没有原话可带。
 *
 * 不许在这里拼一句中文 —— 那是 UI 的事；也不许把码复制进 `reason`。
 */
function ledgerBroken(b: LedgerBrokenFail): CloudFailure {
  return b.fail === 'readError'
    ? { fail: 'CLOUD_LEDGER_BROKEN', reason: describeReadFailure(b.failure) }
    : { fail: 'CLOUD_LEDGER_BROKEN' }
}

/** unit id → unit hash；台账的 per-unit 指纹 */
function unitHashes(units: Record<string, SyncUnit>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [id, unit] of Object.entries(units)) out[id] = unit.hash
  return out
}

export function createCloudEngine(deps: CloudDeps): CloudEngine {
  async function getStatus(): Promise<CloudStatus> {
    const read = await deps.ledger.read()
    const pendingItems = deps.pending.list()
    // T-114：判别位是 `ledgerState`（三态）。`broken` 不许被压成"没有台账"——
    // 那会让设置页显示"还没有同步记录"，用户据此点「上传」就把云端覆盖了
    const ledger = read.status === 'ok' ? read.ledger : null
    return {
      configured: deps.config.isConfigured(),
      autoSyncEnabled: deps.config.isAutoSyncEnabled(),
      ledgerState: read,
      rev: ledger?.rev ?? 0,
      syncedAt: ledger?.syncedAt ?? 0,
      localHash: ledger?.localHash ?? '',
      pending: pendingItems.length,
      // 明细给 UI 分原因显示（T-74）：一个数字分不出"未配置"和"冲突"
      pendingItems,
    }
  }

  async function upload(options: UploadOptions = {}): Promise<CloudOutcome> {
    if (!deps.config.isConfigured()) {
      return {
        status: 'error',
        failure: { fail: 'CLOUD_NOT_CONFIGURED' },
      }
    }

    let localUnits: Record<string, SyncUnit>
    try {
      localUnits = await collectUnits(deps.entries)
    } catch (error) {
      return { status: 'error', failure: errorResult(error) }
    }

    const localHash = unitsHash(localUnits)
    // T-114：坏台账**不许**当成"没有台账"。后者会让 `decideUpload` 判成 `cloud-newer`，
    // 用户确认后就把云端那一份覆盖掉；而"读不到"根本不是冲突，是**没有依据判断**。
    const read = await deps.ledger.read()
    if (read.status === 'broken') return { status: 'error', failure: ledgerBroken(read) }
    const ledger = read.status === 'ok' ? read.ledger : null

    let pulled: CloudPullOutcome
    try {
      pulled = await deps.transport.pull()
    } catch (error) {
      return { status: 'error', failure: errorResult(error) }
    }
    //读不懂 ≠ 云端为空。后者会以 rev=1 覆盖云端
    if (pulled.status === 'unreadable') {
      return { status: 'error', failure: cloudUnreadable(pulled.reason) }
    }
    const cloud = pulled.status === 'ok' ? pulled.snapshot : null

    const decision = decideUpload({
      cloudReadable: true,
      cloudExists: cloud !== null,
      cloudRev: cloud?.rev ?? 0,
      cloudUpdatedAt: cloud?.updatedAt ?? 0,
      ledger,
      localHash,
      cloudHash: cloud ? unitsHash(cloud.units) : '',
    })

    // 内容一致 = 已经对齐（跑完了，没写东西），不是「跳过」：跳过只留给闸门挡下那种「一次请求都没发」
    if (decision.inSync) return { status: 'ok' }
    if (decision.kind !== 'none' && !options.force) {
      if (!options.onConfirm) {
        return {
          status: 'cancelled',
          failure: { fail: 'CLOUD_REV_CONFLICT' },
        }
      }
      const confirmed = await options.onConfirm(decision)
      if (!confirmed) {
        return {
          status: 'cancelled',
          failure: { fail: 'CLOUD_CANCELLED' },
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
      return { status: 'ok' }
    } catch (error) {
      return { status: 'error', failure: errorResult(error) }
    }
  }

  async function download(options: DownloadOptions = {}): Promise<CloudOutcome> {
    if (!deps.config.isConfigured()) {
      return {
        status: 'error',
        failure: { fail: 'CLOUD_NOT_CONFIGURED' },
      }
    }

    let pulled: CloudPullOutcome
    try {
      pulled = await deps.transport.pull()
    } catch (error) {
      return { status: 'error', failure: errorResult(error) }
    }
    //读不懂不许说成"云端没有数据"（用户会以为云端真的是空的）
    if (pulled.status === 'unreadable') {
      return { status: 'error', failure: cloudUnreadable(pulled.reason) }
    }
    const cloud = pulled.status === 'ok' ? pulled.snapshot : null

    if (!cloud) {
      return {
        status: 'error',
        failure: { fail: 'CLOUD_EMPTY' },
      }
    }

    let localUnits: Record<string, SyncUnit>
    try {
      localUnits = await collectUnits(deps.entries)
    } catch (error) {
      return { status: 'error', failure: errorResult(error) }
    }

    const diff: SyncDiff = diffUnits(cloud.units, localUnits)
    if (diff.conflicts.length > 0) {
      if (!options.onConfirm) {
        return {
          status: 'cancelled',
          failure: {
            fail: 'CLOUD_CANCELLED',
            reason: String(diff.conflicts.length),
          },
        }
      }
      const confirmed = await options.onConfirm(diff)
      if (!confirmed) {
        return {
          status: 'cancelled',
          failure: { fail: 'CLOUD_CANCELLED' },
        }
      }
    }

    const adapters = adapterMap(deps.entries)
    const failed: string[] = []

    for (const [id, unit] of Object.entries(cloud.units)) {
      const adapter = adapters.get(id)
      if (!adapter) {
        failed.push(id)
        continue
      }

      const result: WriteOutcome = await adapter.write(unit)
      if (result.status === 'error') failed.push(`${id}（${result.reason}）`)
    }

    if (failed.length > 0) {
      return {
        status: 'error',
        failure: {
          fail: 'CLOUD_WRITE_FAILED',
          reason: failed.join('; '),
        },
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
      return { status: 'error', failure: errorResult(error) }
    }

    deps.pending.clear()
    return { status: 'ok' }
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
  async function pushUnits(ids: string[], options: PushUnitsOptions = {}): Promise<CloudOutcome> {
    const wanted = [...new Set(ids.filter(Boolean))].sort()
    // 没有要推的项 = 跑完了，不算跳过（跳过只留给闸门）
    if (wanted.length === 0) return { status: 'ok' }

    if (!deps.config.isConfigured()) {
      // 不发请求：没有 endpoint，发出去只会是半截请求
      deps.pending.record(wanted, 'not-configured')
      return {
        status: 'error',
        failure: { fail: 'CLOUD_NOT_CONFIGURED' },
      }
    }

    const adapters = adapterMap(deps.entries)
    const unknown = wanted.filter((id) => !adapters.has(id))
    if (unknown.length > 0) {
      return {
        status: 'error',
        failure: {
          fail: 'CLOUD_COLLECT_FAILED',
          reason: unknown.join('; '),
        },
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
        status: 'error',
        failure: {
          fail: 'CLOUD_COLLECT_FAILED',
          // 底层原文：哪一项、它自己说了什么
          reason: collected.failed.map((f) => `${f.id}: ${f.message}`).join('; '),
        },
      }
    }

    let pulled: CloudPullOutcome
    try {
      pulled = await deps.transport.pull()
    } catch (error) {
      recordNetworkPending(deps.pending, ready, error)
      return { status: 'error', failure: errorResult(error) }
    }
    //读不懂就**不推**（否则读不懂的 unit 会被当成"云端没有"，直接覆盖推上去）
    if (pulled.status === 'unreadable') {
      deps.pending.record(ready, 'conflict')
      return { status: 'error', failure: cloudUnreadable(pulled.reason) }
    }
    const cloud: CloudSnapshotView | null = pulled.status === 'ok' ? pulled.snapshot : null

    // T-114：坏台账 → **不许推**。`ledger = null` 时 per-unit 基线全缺，T-76① 的
    // "没有基线不判冲突"会让**每一个改过的 unit 直接推**，别人在另一台机器上的改动被覆盖
    const read = await deps.ledger.read()
    if (read.status === 'broken') {
      return { status: 'error', failure: ledgerBroken(read) }
    }
    const ledger = read.status === 'ok' ? read.ledger : null
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
      // 写基线失败必须变成"这一轮没成功"，不能装作"内容一致、已是最新"：
      // 基线没推进，下次本地真改了就会算出假冲突，而用户看不到任何原因。
      try {
        refreshBaseline()
      } catch (error) {
        // 写盘错是普通 Error（没有 CloudError 码），这里的失败类别由**这一行代码**决定
        deps.pending.record(ready, 'network', 'CLOUD_WRITE_FAILED')
        return {
          status: 'error',
          failure: {
            fail: 'CLOUD_WRITE_FAILED',
            reason: error instanceof Error ? error.message : String(error),
          },
        }
      }
      return { status: 'ok' }
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
          status: 'cancelled',
          failure: {
            fail: 'CLOUD_REV_CONFLICT',
            reason: conflicts.join('; '),
          },
        }
      }
      const confirmed = await options.onConfirm({ units: conflicts, cloudRev: cloud?.rev ?? 0 })
      if (!confirmed) {
        deps.pending.record(conflicts, 'conflict')
        return {
          status: 'cancelled',
          failure: { fail: 'CLOUD_CANCELLED' },
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
      recordNetworkPending(deps.pending, changed, error)
      return { status: 'error', failure: errorResult(error) }
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
      return { status: 'error', failure: errorResult(error) }
    }

    // 只清"这次真的对齐了"的 unit：读失败的那些刚记进 pending，清掉就等于把痕迹抹了
    deps.pending.clear(ready)
    return { status: 'ok' }
  }

  return { getStatus, upload, download, pushUnits }
}
