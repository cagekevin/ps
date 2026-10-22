import { setAutoSyncEnabled, setCloudUrl } from '@/cep/cloud/config'
import { cloudEngine } from '@/cep/cloud/setup'
import { CepError } from '@/utils/errors'
import { defineCommand } from './registry'
import type { Command } from './types'

function throwIfFailed(ok: boolean, error?: string, errorCode?: string): void {
  if (ok) return
  if (errorCode === 'CLOUD_NOT_CONFIGURED') {
    throw new CepError('INIT', error ?? '未配置云同步地址')
  }
  throw new CepError('NETWORK', error ?? '云同步失败')
}

export const cloudCommands: Command<unknown>[] = [
  defineCommand({
    id: 'cloud.setUrl',
    title: '设置云同步地址',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { url }) {
      setCloudUrl(url)
    },
  }),

  defineCommand({
    id: 'cloud.setAutoSync',
    title: '设置云同步自动同步',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { enabled }) {
      setAutoSyncEnabled(enabled)
    },
  }),

  defineCommand({
    id: 'cloud.upload',
    title: '上传本地预设',
    group: 'system',
    requires: 'none',
    kind: 'long',
    async run(_ctx, { force, onConfirm }) {
      const result = await cloudEngine.upload({ force, onConfirm })
      throwIfFailed(result.ok, result.error, result.errorCode)
    },
  }),

  defineCommand({
    id: 'cloud.download',
    title: '下载云端预设',
    group: 'system',
    requires: 'none',
    kind: 'long',
    async run(_ctx, { onConfirm }) {
      const result = await cloudEngine.download({ onConfirm })
      throwIfFailed(result.ok, result.error, result.errorCode)
    },
  }),
]
