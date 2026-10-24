// 是什么：云同步台账（`sj_v5_cloud_sync.json`）读写——rev / 同步时间 / 整包指纹 / per-unit 指纹
// 唯一入口：云同步的「上次同步到哪」只能读写这里；engine 经 CloudLedgerPort 使用
// 替代了什么：无（本项目自有设计）；per-unit 指纹是 T-55/T-56 新加的，老文件仍可读
// 谁在用：cep/cloud/setup.ts 注入 engine；cloud/auto-sync.ts 的 hasCloudLedger
// 禁止：不在这里判断冲突、不发请求；这里只做「文件 ↔ 对象」

import { readTextOutcome, userDir, writeTextFileAtomic } from '@/cep/fs'
import type { CloudLedgerRecord, LedgerRead } from '@/cloud/types'
import { CloudError } from '@/domain/cloud'
import { log } from '@/utils/logger'

const FILE = 'sj_v5_cloud_sync.json'

function path(): string {
  return `${userDir()}/${FILE}`
}

/** 只收非空字符串；空对象/脏数据当作「没有 per-unit 依据」 */
function readUnits(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out: Record<string, string> = {}
  for (const [id, hash] of Object.entries(value as Record<string, unknown>)) {
    if (typeof hash === 'string' && hash) out[id] = hash
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * 读台账：**三态**（T-114）。`none` = 文件不在（首次使用）；`broken` = 在、但读不到 /
 * 不是合法 JSON / 缺 `localHash`。
 *
 * 为什么必须分开：以前两者都返回 `null`，下游据此报 `hasLedger:false` / `rev:0`，
 * 设置页显示"本地还没有同步记录，先点「从云端拉取」"——用户可能点「上传」，
 * 把云端那一份覆盖掉。`broken` 现在一律**拒绝上传**（见 `cloud/engine.ts`）。
 *
 * 代价：不再是同步函数（`readTextSync` 只给 `null`，分不出 `ENOENT` 与 `EPERM`）。
 * 所以 ADR-26 ④ 的"同步例外"从 3 处降到 2 处（CAS 比对、界面偏好）。
 */
export async function readCloudLedger(): Promise<LedgerRead> {
  const read = await readTextOutcome(path())
  if (read.status === 'notSeen') return { status: 'none' }
  if (read.status === 'error') {
    log.error('cloud', `台账读不到：${read.reason}`)
    return { status: 'broken', reason: read.reason }
  }

  let raw: Partial<CloudLedgerRecord>
  try {
    raw = JSON.parse(read.text) as Partial<CloudLedgerRecord>
  } catch (e) {
    log.error('cloud', '台账不是合法 JSON', e)
    return { status: 'broken', reason: '不是合法 JSON' }
  }
  if (typeof raw.localHash !== 'string' || !raw.localHash) {
    log.error('cloud', '台账缺少 localHash，无法判断"上次同步到哪"')
    return { status: 'broken', reason: '缺少 localHash' }
  }
  const units = readUnits(raw.units)
  return {
    status: 'ok',
    ledger: {
      rev: Number.isFinite(Number(raw.rev)) ? Math.max(0, Math.floor(Number(raw.rev))) : 0,
      syncedAt: Number.isFinite(Number(raw.syncedAt))
        ? Math.max(0, Math.floor(Number(raw.syncedAt)))
        : 0,
      localHash: raw.localHash,
      ...(units ? { units } : {}),
    },
  }
}

export function writeCloudLedger(ledger: CloudLedgerRecord): void {
  const text = JSON.stringify(ledger)
  try {
    const target = path()
    // 原子写失败必须抛：退回普通写等于摘掉 rename 保护（TD-09-27），台账写坏会污染同步判定
    const written = writeTextFileAtomic(target, text)
    if (written.status === 'error') {
      throw new CloudError('CLOUD_WRITE_FAILED', `台账写入失败：${written.reason}`)
    }
  } catch (error) {
    throw new CloudError(
      'CLOUD_WRITE_FAILED',
      error instanceof Error ? error.message : '台账写入失败',
    )
  }
}

/**
 * "有没有台账"的护栏。**只有 `ok` 才算有**——坏台账不能冒充"没有"，也不能冒充"有"。
 * 调用方要看区别就用 `readCloudLedger()` 的 `status`（`gate()` 就是这么分的）。
 */
export async function hasCloudLedger(): Promise<boolean> {
  return (await readCloudLedger()).status === 'ok'
}
