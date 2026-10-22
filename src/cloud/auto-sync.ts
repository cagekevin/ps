import { CLOUD_SYNC_FIRST_DELAY_MS, CLOUD_SYNC_INTERVAL_MS } from '@/config/cloud'
import { isAutoSyncEnabled, isCloudConfigured } from '@/cep/cloud/config'
import { hasCloudLedger } from '@/cep/cloud/ledger'
import { cloudEngine } from '@/cep/cloud/setup'

const FIRST_DELAY_MS = CLOUD_SYNC_FIRST_DELAY_MS
const INTERVAL_MS = CLOUD_SYNC_INTERVAL_MS

let timer: ReturnType<typeof setTimeout> | null = null
let started = false
let running = false

function scheduleNext(delay = INTERVAL_MS): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void tick(), delay)
}

async function tick(): Promise<void> {
  try {
    if (!isAutoSyncEnabled() || !isCloudConfigured()) return
    if (!hasCloudLedger()) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    if (typeof document !== 'undefined' && document.hidden) return
    if (running) return

    running = true
    await cloudEngine.upload()
  } finally {
    running = false
    scheduleNext()
  }
}

export function startCloudAutoSync(): void {
  if (started) return
  started = true
  scheduleNext(FIRST_DELAY_MS)
}

export function stopCloudAutoSync(): void {
  if (timer) clearTimeout(timer)
  timer = null
  started = false
  running = false
}
