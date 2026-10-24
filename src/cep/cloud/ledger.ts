// 是什么：云同步台账（`sj_v5_cloud_sync.json`）读写——rev / 同步时间 / 整包指纹 / per-unit 指纹
// 唯一入口：云同步的「上次同步到哪」只能读写这里；engine 经 CloudLedgerPort 使用
// 替代了什么：无（本项目自有设计）；per-unit 指纹是 T-55/T-56 新加的，老文件仍可读
// 谁在用：cep/cloud/setup.ts 注入 engine；cloud/auto-sync.ts 的 hasCloudLedger
// 禁止：不在这里判断冲突、不发请求；这里只做「文件 ↔ 对象」

import { readTextSync, userDir, writeTextFile, writeTextFileAtomic } from '@/cep/fs'
import type { CloudLedgerRecord } from '@/cloud/types'
import { CloudError } from '@/domain/cloud'

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

export function readCloudLedger(): CloudLedgerRecord | null {
  try {
    // 同步读是 ADR-26 ④ 的具名例外之二：`hasCloudLedger` 被同步谓词 `gate()` 调用。
    // 代价：`notSeen` 与 `error` 在这里仍是同一个 `null`（`!text`），坏台账会被读成"没有台账"——
    // 这是 ADR-14 扩展二的已知欠账（`docs/生成/RepoRead消费方清单.md` §6.6 实证），
    // 要修得先把 `gate()` 与 `CloudLedgerPort.read` 改成 async，另开条目（T-107 已登记）。
    const text = readTextSync(path())
    if (!text) return null
    const raw = JSON.parse(text) as Partial<CloudLedgerRecord>
    if (typeof raw.localHash !== 'string' || !raw.localHash) return null
    const units = readUnits(raw.units)
    return {
      rev: Number.isFinite(Number(raw.rev)) ? Math.max(0, Math.floor(Number(raw.rev))) : 0,
      syncedAt: Number.isFinite(Number(raw.syncedAt))
        ? Math.max(0, Math.floor(Number(raw.syncedAt)))
        : 0,
      localHash: raw.localHash,
      ...(units ? { units } : {}),
    }
  } catch {
    return null
  }
}

export function writeCloudLedger(ledger: CloudLedgerRecord): void {
  const text = JSON.stringify(ledger)
  try {
    const target = path()
    if (!writeTextFileAtomic(target, text)) writeTextFile(target, text)
  } catch (error) {
    throw new CloudError(
      'CLOUD_WRITE_FAILED',
      error instanceof Error ? error.message : '台账写入失败',
    )
  }
}

export function hasCloudLedger(): boolean {
  return readCloudLedger() !== null
}
