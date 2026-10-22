/**
 * 云同步地址即账号。
 * 这是本项目专属链接，不要外传、不要打进公开构建。
 */
export const CLOUD_SYNC_GAS_URL =
  'https://script.google.com/macros/s/AKfycbyNJHgNZMci2kIY0jfhozriJYwPkw4phoUZh7nWwW1rw3ZlJaWg282EygOEnyxyka6X/exec'

/**
 * 改动后的静默期：60 秒（ADR-21）。
 *
 * 通道是**整包快照 POST**（`src/cep/cloud/transport.ts:80-82`），不是原版按文件分片上传；
 * 原版 3 秒防抖成立的前提是"一次只传一个变更文件"，整包通道下 3 秒会把 GAS 和云端 JSON 打爆。
 * **60 秒是通道决定的，不是手感偏好，不许往下调。**
 */
export const CLOUD_SYNC_DEBOUNCE_MS = 60_000

/**
 * 连续编辑时的最大等待：5 分钟（ADR-21）。
 *
 * 纯防抖会被"手一直没停"无限重置——用户改一小时，就一小时推不出去一次。
 * 从本轮第一次标脏起算，到点必推一次，不等静默。
 */
export const CLOUD_SYNC_MAX_WAIT_MS = 5 * 60_000

/** 面板启动后首轮补偿的延迟：让启动装配先落定，不和首屏抢 */
export const CLOUD_SYNC_FIRST_DELAY_MS = 30_000

/** 失败退避梯度：1 → 2 → 5 → 15 分钟；用完一直按最后一档重试 */
export const CLOUD_SYNC_BACKOFF_MS = [60_000, 2 * 60_000, 5 * 60_000, 15 * 60_000] as const
