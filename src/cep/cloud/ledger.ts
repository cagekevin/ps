import { readTextFile, userDir, writeTextFile, writeTextFileAtomic } from '@/cep/fs'
import { CloudError, type CloudLedger } from '@/domain/cloud'

const FILE = 'sj_v5_cloud_sync.json'

function path(): string {
  return `${userDir()}/${FILE}`
}

export function readCloudLedger(): CloudLedger | null {
  try {
    const text = readTextFile(path())
    if (!text) return null
    const raw = JSON.parse(text) as Partial<CloudLedger>
    if (typeof raw.localHash !== 'string' || !raw.localHash) return null
    return {
      rev: Number.isFinite(Number(raw.rev)) ? Math.max(0, Math.floor(Number(raw.rev))) : 0,
      syncedAt: Number.isFinite(Number(raw.syncedAt))
        ? Math.max(0, Math.floor(Number(raw.syncedAt)))
        : 0,
      localHash: raw.localHash,
    }
  } catch {
    return null
  }
}

export function writeCloudLedger(ledger: CloudLedger): void {
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
