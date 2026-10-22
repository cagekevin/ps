// 是什么：云同步的唯一网络出口——自建 GAS 网关的整包快照 push / pull
// 唯一入口：云端读写只能经过这里；引擎经 CloudTransportPort 使用
// 替代了什么：原版 `0425.js:3469-3579` 的 `pushFile` 家族（syncserver.pszhuli.com 文件 API）
// 谁在用：cep/cloud/setup.ts 注入 engine
// 禁止：这里不写业务判断；页面/组件不许 import
//
// UNVERIFIED(T-55/T-56)：真实网关行为未验——本机无云服务端、无原版 token，
// 所有相关用例都是 mock HTTP（`vi.stubGlobal('fetch')`）。真实字段增减、限流、
// 配额、并发写的胜者，只能等有可用部署后实测；不要据本文件宣称"同步能用"。

import {
  CloudError,
  normalizeCloudPayload,
  type CloudSnapshot,
  type CloudSnapshotView,
} from '@/domain/cloud'
import { getCloudUrl } from './config'

const TIMEOUT_MS = 20_000
let syncing = false

async function callGateway(
  action: 'push_data' | 'pull_data',
  data?: CloudSnapshot,
): Promise<Record<string, unknown>> {
  if (syncing) throw new CloudError('CLOUD_NETWORK', '同步正在进行')

  const url = getCloudUrl()
  if (!url) throw new CloudError('CLOUD_NOT_CONFIGURED', '未配置同步地址')

  syncing = true
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null

  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data === undefined ? { action } : { action, data }),
      signal: controller?.signal,
    })

    if (!response.ok) {
      throw new CloudError('CLOUD_NETWORK', `GAS HTTP ${response.status}`)
    }

    const text = await response.text()
    if (text.includes('<html')) {
      throw new CloudError('CLOUD_PERMISSION_HTML', 'GAS 返回了权限页，请确认部署权限为“所有人”')
    }

    let json: Record<string, unknown>
    try {
      json = JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new CloudError('CLOUD_BAD_RESPONSE', 'GAS 返回不是合法 JSON')
    }

    if (typeof json.error === 'string' && json.error) {
      throw new CloudError('CLOUD_BAD_RESPONSE', json.error)
    }
    if (json.ok === false) {
      throw new CloudError('CLOUD_BAD_RESPONSE', String(json.msg ?? '同步失败'))
    }

    return json
  } catch (error) {
    if (error instanceof CloudError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CloudError('CLOUD_NETWORK', '同步超时')
    }
    throw new CloudError('CLOUD_NETWORK', error instanceof Error ? error.message : '同步网络失败')
  } finally {
    if (timer) clearTimeout(timer)
    syncing = false
  }
}

export async function pushSnapshot(snapshot: CloudSnapshot): Promise<void> {
  await callGateway('push_data', snapshot)
}

export async function pullSnapshot(): Promise<CloudSnapshotView | null> {
  const response = await callGateway('pull_data')
  return normalizeCloudPayload(response)
}
