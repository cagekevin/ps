import { createCloudEngine } from '@/cloud/engine'
import { cloudEntries } from './entries'
import { isAutoSyncEnabled, isCloudConfigured } from './config'
import { readCloudLedger, writeCloudLedger } from './ledger'
import { pullSnapshot, pushSnapshot } from './transport'

/** 唯一装配点：engine 只依赖端口，具体 CEP 实现只在这里注入 */
export const cloudEngine = createCloudEngine({
  config: {
    isConfigured: isCloudConfigured,
    isAutoSyncEnabled,
  },
  transport: {
    push: pushSnapshot,
    pull: pullSnapshot,
  },
  ledger: {
    read: readCloudLedger,
    write: writeCloudLedger,
  },
  entries: cloudEntries,
})
