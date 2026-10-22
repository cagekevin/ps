// 是什么：缓存占用的显示格式化（纯函数，无 IO）
// 唯一入口：`ClearCacheDialog` 里把 `dirUsage()` 的字节数变成人能读的字符串
// 替代了什么：无（首次落）
// 谁在用：pages/set/components/ClearCacheDialog.vue、tests/pages/set-clear-cache.test.ts
// 禁止：不在这里读磁盘；不格式化除字节以外的单位

/**
 * 字节 → 显示串。1024 进制（与原面板其它体积文案一致），
 * 小于 1KB 显示整数 B，其余保留一位小数并去掉多余的 `.0`。
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)}B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = Math.round(value * 10) / 10
  return `${rounded}${units[unit]}`
}
