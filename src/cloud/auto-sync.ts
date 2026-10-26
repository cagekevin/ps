// 是什么：云同步的启动装配——启动补偿 + 可见性信号；**不再由时间驱动**（ADR-21）
// 唯一入口：main.ts 只调 startCloudAutoSync()；所有触发点都只调队列，不发请求
// 替代了什么：2 小时自链 `setTimeout`（原 :20-23,25-39）与 `if (document.hidden) return`（原 :30）
// 谁在用：src/main.ts:74
// 禁止：页面/组件不许 import；这里不发请求（请求归 cep/cloud/setup.ts 的队列）

import { CLOUD_SYNC_FIRST_DELAY_MS } from '@/config/cloud'
import { startCloudChangeSync } from '@/cep/cloud/change-sync'
import { cloudSyncQueue } from '@/cep/cloud/setup'

let started = false
let bootTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 可见性当**信号**用，不当禁止用（ADR-21）。
 *
 * `document.hidden` 不能当"隐藏就跳过上传"用——Chromium 的 Page Visibility 只节流定时器、
 * 不阻止 `fetch`，那条判断的实际效果是"用户没盯着面板时永远不同步"，而 PS 里面板常驻后台是常态。
 * 现在改成两个方向各做一件事：
 * - 变隐藏：有脏立刻推一次（页面随时可能随 PS 一起被销毁）；
 * - 变可见：sweep 一次，补上"隐藏期间别的机器改了云端 / 本地有掉队的改动"。
 */
function onVisibilityChange(): void {
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
  if (hidden) cloudSyncQueue.flushDirty('hidden')
  else cloudSyncQueue.requestSync('visible')
}

export function startCloudAutoSync(): void {
  if (started) return
  started = true

  // 事件驱动那条：层级预设 / 动作仓库改了就标脏，由队列决定什么时候真发
  startCloudChangeSync()

  // 启动补偿：不等 2 小时，也不读 cloud.pending——pending 是"失败留下的痕迹"，不是触发源；
  // "哪些 unit 本地更新"由 pushUnits 的三方比较判定（engine 里 base/mine/theirs）
  if (!bootTimer) {
    bootTimer = setTimeout(() => {
      bootTimer = null
      cloudSyncQueue.requestSync('boot')
    }, CLOUD_SYNC_FIRST_DELAY_MS)
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
}

/** 仅供测试与卸载：撤掉启动装配（队列本身的生命周期归 setup.ts） */
export function stopCloudAutoSync(): void {
  if (bootTimer) {
    clearTimeout(bootTimer)
    bootTimer = null
  }
  if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
  started = false
}
