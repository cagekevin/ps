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

export function isCloudConfigured(): boolean {
  const url = getCloudUrl()
  return url.startsWith('https://script.google.com/macros/s/') && url.endsWith('/exec')
}

export function isAutoSyncEnabled(): boolean {
  return getPref<boolean>(AUTO_SYNC_KEY, false) === true
}

export function setAutoSyncEnabled(enabled: boolean): void {
  setPref(AUTO_SYNC_KEY, enabled)
}
