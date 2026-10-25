import { CLOUD_SYNC_GAS_URL } from '@/config/cloud'
import { getPref, setPref } from '@/cep/data/settings'

/** 本地覆盖键；空值时回退到 config/cloud.ts */
const GAS_URL_KEY = 'cloud.gasUrl'
const AUTO_SYNC_KEY = 'cloud.autoSync'

export function getCloudUrl(): string {
  const value = getPref<unknown>(GAS_URL_KEY, '')
  const override = typeof value === 'string' ? value.trim() : ''
  return override || CLOUD_SYNC_GAS_URL
}

export function setCloudUrl(url: string): void {
  setPref(GAS_URL_KEY, url.trim())
}

/**
 * **有效地址**能不能用：是不是一条合法的 GAS `/exec` 端点。
 *
 * 判的是"地址可用"，**不是"用户配置过"**。有效地址 = 偏好 `cloud.gasUrl`
 * 非空就取它，**空值回退内置常量**（见 `config/cloud.ts` 的 `CLOUD_SYNC_GAS_URL`），
 * 所以对绝大多数用户它恒为 `true` —— 开箱即可用是设计，不是默认值兜底。
 * 真正让云同步停手的是开关 `isAutoSyncEnabled()`（默认关）。
 */
export function isCloudUrlUsable(): boolean {
  const url = getCloudUrl()
  return url.startsWith('https://script.google.com/macros/s/') && url.endsWith('/exec')
}

export function isAutoSyncEnabled(): boolean {
  return getPref<boolean>(AUTO_SYNC_KEY, false) === true
}

export function setAutoSyncEnabled(enabled: boolean): void {
  setPref(AUTO_SYNC_KEY, enabled)
}
