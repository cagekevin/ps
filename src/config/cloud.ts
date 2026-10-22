/**
 * 云同步地址即账号。
 * 这是本项目专属链接，不要外传、不要打进公开构建。
 */
export const CLOUD_SYNC_GAS_URL =
  'https://script.google.com/macros/s/AKfycbyNJHgNZMci2kIY0jfhozriJYwPkw4phoUZh7nWwW1rw3ZlJaWg282EygOEnyxyka6X/exec'

/** 自动同步间隔：2 小时 */
export const CLOUD_SYNC_INTERVAL_MS = 2 * 60 * 60_000

/** 启动后首轮同步延迟 */
export const CLOUD_SYNC_FIRST_DELAY_MS = 30_000
