// 是什么：云同步的后台启动点——定时整包同步 + 事件驱动按 unit 推送（T-55/T-56）
// 唯一入口：main.ts 只调 startCloudAutoSync()，两条后台链路都从这里起
// 替代了什么：原版散落的定时器 + emit 监听；这里合成一个启动函数
// 谁在用：src/main.ts:74
// 禁止：页面/组件不许 import；这里不直接发请求（都在 engine 内）

import { CLOUD_SYNC_FIRST_DELAY_MS, CLOUD_SYNC_INTERVAL_MS } from '@/config/cloud'
import { startCloudChangeSync } from '@/cep/cloud/change-sync'
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
  // 事件驱动那条：层级预设 / 动作仓库改了就 3 秒后推自己那条 unit。
  // 与上面的定时整包同步并存：定时器是兜底（离线/未配置期间的改动靠它补推）。
  startCloudChangeSync()
  scheduleNext(FIRST_DELAY_MS)
}
