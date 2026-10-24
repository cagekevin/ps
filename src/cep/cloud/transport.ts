// 是什么：云同步的唯一网络出口——自建 GAS 网关的整包快照 push / pull
// 唯一入口：云端读写只能经过这里；引擎经 CloudTransportPort 使用
// 替代了什么：原版 `0425.js:3469-3579` 的 `pushFile` 家族（syncserver.pszhuli.com 文件 API）
// 谁在用：cep/cloud/setup.ts 注入 engine
// 禁止：这里不写业务判断；页面/组件不许 import
//
// UNVERIFIED(T-55/T-56)：真实网关行为未验——没有云服务端与 token，无法验证，
// 所有相关用例都是 mock HTTP（`vi.stubGlobal('fetch')`）。真实字段增减、限流、
// 配额、并发写的胜者，只能等有可用部署后实测；不要据本文件宣称"同步能用"。

import {
  CloudError,
  normalizeCloudPayload,
  type CloudPullOutcome,
  type CloudSnapshot,
} from '@/domain/cloud'
import { getCloudUrl } from './config'

const TIMEOUT_MS = 20_000

/**
 * 单进程 FIFO：同一时刻只有一个请求在飞（T-77）。
 *
 * 以前这里是"在飞就 `throw new CloudError('CLOUD_NETWORK','同步正在进行')`"：自动推送和手动上传
 * 撞上时，被撞的那次会拿到一个**假的网络错误**，还会被 engine 记进 `pending('network')`。
 * 改成排队后，撞车只是等一下。整段 pull→push 的互斥由 `cloudSyncQueue` 负责（同一队列里跑），
 * 这里只保证"不多请求并发"。
 *
 * 跨进程（另一个面板 / 另一台机器）仍然不保证——服务端不做 CAS，见 ADR-21「代价」。
 */
let chain: Promise<unknown> = Promise.resolve()

function serial<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task)
  chain = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

async function callGateway(
  action: 'push_data' | 'pull_data',
  data?: CloudSnapshot,
): Promise<Record<string, unknown>> {
  return serial(() => request(action, data))
}

async function request(
  action: 'push_data' | 'pull_data',
  data?: CloudSnapshot,
): Promise<Record<string, unknown>> {
  const url = getCloudUrl()
  if (!url) throw new CloudError('CLOUD_NOT_CONFIGURED', '未配置同步地址')

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
  }
}

export async function pushSnapshot(snapshot: CloudSnapshot): Promise<void> {
  await callGateway('push_data', snapshot)
}

/**
 * 拉云端快照。**三态**（TD-11-5）：网络/权限/非 JSON 仍然抛 `CloudError`（既有语义不变），
 * 200 但结构不符返回 `{status:'unreadable'}` —— 由引擎决定"拒绝覆盖云端"，
 * 这里不替它判（ADR-0026 ②：原语只报观测）。
 */
export async function pullSnapshot(): Promise<CloudPullOutcome> {
  const response = await callGateway('pull_data')
  return normalizeCloudPayload(response)
}
