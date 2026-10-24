import { setAutoSyncEnabled, setCloudUrl } from '@/cep/cloud/config'
import { cloudEngine } from '@/cep/cloud/setup'
import { CepError } from '@/utils/errors'
import { defineCommand } from './registry'
import type { Command } from './types'

/**
 * 命令结果码 → CepError。**只有"用户该做什么不同"的才换码**（§四点三五 第 3 条）：
 * - 取消：用户自己点的，不该弹失败提示（12-22 的消费点）→ `CANCELLED`
 * - 未配置：去设置页填地址 → `INIT`
 * - 其余（冲突 / 写盘 / 读盘 / 网络 / 权限…）：一律 `NETWORK`，**文案原样透传**
 *   （`describeCepError` 对 NETWORK 用 `e.message`，所以引擎那句具体原因一个字都不丢）；
 *   再细分错误码没有任何消费者按它做不同的事——分了就是死码（TD-12-23 的判据）。
 */
function throwIfFailed(ok: boolean, error?: string, errorCode?: string, cancelled?: boolean): void {
  if (ok) return
  if (cancelled || errorCode === 'CLOUD_CANCELLED') {
    throw new CepError('CANCELLED', error ?? '已取消')
  }
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
      throwIfFailed(result.ok, result.error, result.errorCode, result.cancelled)
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
      throwIfFailed(result.ok, result.error, result.errorCode, result.cancelled)
    },
  }),
]
