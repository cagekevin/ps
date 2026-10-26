// 是什么：云同步台账（`sj_v5_cloud_sync.json`）读写——rev / 同步时间 / 整包指纹 / per-unit 指纹
// 唯一入口：云同步的「上次同步到哪」只能读写这里；engine 经 CloudLedgerPort 使用
// 替代了什么：无（本项目自有设计）；per-unit 指纹是 T-55/T-56 新加的，老文件仍可读
// 谁在用：cep/cloud/setup.ts 注入 engine；cloud/auto-sync.ts 的 hasCloudLedger
// 禁止：不在这里判断冲突、不发请求；这里只做「文件 ↔ 对象」

import { userDir } from '@/cep/paths'
import { DATA_FILES } from '@/cep/env'
import { writeDiskSync } from '@/cep/disk-write'
import { readRepoFile } from '@/cep/data/repo-read'
import type { CloudLedgerRecord, LedgerRead } from '@/cloud/types'
import { CloudError } from '@/domain/cloud'
import { isRecord } from '@/utils/guards'
import { log } from '@/utils/logger'
import { shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'

const FILE = DATA_FILES.cloudLedger

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
  // 走档 1 的**未折叠**结论：台账"不在"与"读坏了"是两个结论，不能拿默认值顶（T-114）
  const outcome = readRepoFile(path(), decodeLedger)
  if (outcome.status === 'notSeen') return { status: 'none' }
  if (outcome.status === 'error') {
    // only `readError` 有技术现场；另两种是"内容不对"，本身没有 errno
    log.error(
      'cloud',
      '台账读不到',
      outcome.fail === 'readError' ? outcome.failure : { fail: outcome.fail },
    )
    // 两臂各自成型：读盘失败带现场，内容失败只带子码 —— 不再把 UI 文案当"底层原话"传下去
    return outcome.fail === 'readError'
      ? { status: 'broken', fail: 'readError', failure: outcome.failure }
      : { status: 'broken', fail: outcome.fail }
  }
  return { status: 'ok', ledger: outcome.value }
}

/** 非负整数；取不到就 0（`rev` / `syncedAt` 缺失只影响"从哪开始比"，不影响台账可信度） */
function nonNegInt(value: unknown): number {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0
}

/**
 * 台账的 decode。`localHash` 是判断"上次同步到哪"的**唯一依据**，缺了就是坏台账 ——
 * 不能当成"rev 0 的新台账"，那会让 `decideUpload` 判成 `cloud-newer`（T-114）。
 */
function decodeLedger(raw: unknown): Decoded<CloudLedgerRecord> | DecodeFail {
  if (!isRecord(raw)) return shapeFail('', 'object', raw)
  const localHash = raw.localHash
  if (typeof localHash !== 'string' || !localHash)
    return shapeFail('localHash', 'string', localHash)
  const units = readUnits(raw.units)
  return {
    value: {
      rev: nonNegInt(raw.rev),
      syncedAt: nonNegInt(raw.syncedAt),
      localHash,
      ...(units ? { units } : {}),
    },
  }
}

export function writeCloudLedger(ledger: CloudLedgerRecord): void {
  const text = JSON.stringify(ledger)
  try {
    const target = path()
    // 原子写失败必须抛：退回普通写等于摘掉 rename 保护，台账写坏会污染同步判定
    // 台账是覆盖写、无 `.bak` 概念（`previous: null`）
    try {
      writeDiskSync(target, text, {
        backup: { mode: 'none', why: '台账可从云端重算，不保留 .bak' },
        cas: { mode: 'skip', why: '台账在 cloud 互斥域内串行写，无并发窗口' },
      })
    } catch (error) {
      throw new CloudError(
        'CLOUD_WRITE_FAILED',
        error instanceof Error ? error.message : String(error),
      )
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
