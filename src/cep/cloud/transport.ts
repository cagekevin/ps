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
import { postText } from '@/cep/http'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'

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

/**
 * HTTP 状态 → 错误码。**只分「重试策略」或「用户该做什么」不同的那些**：
 * - 401/403：权限，自己不会好 → 不自动重试，用户去修 GAS 部署权限；
 * - 429：服务端要我们慢一点 → 可重试，但直接按最长一档退避；
 * - 其余（4xx/5xx/网络/超时）：一律 `CLOUD_NETWORK`——重试方式和用户动作都一样，再多一个码就是死码。
 */
function httpError(status: number): CloudError {
  if (status === 401 || status === 403) {
    return new CloudError('CLOUD_PERMISSION', msg.cloud.fn.gatewayDenied(String(status)))
  }
  if (status === 429) {
    return new CloudError('CLOUD_RATE_LIMITED', msg.cloud.text.gatewayRateLimited)
  }
  return new CloudError('CLOUD_NETWORK', msg.cloud.fn.gasHttpError(String(status)))
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
  if (!url) throw new CloudError('CLOUD_NOT_CONFIGURED', msg.cloud.text.notConfigured)

  try {
    // 网络出口只有一个：`cep/http.ts`。这里不再自己 `fetch`——
    // 超时、abort、发不出去这几种情况都在那一层归一成 CepError('TIMEOUT' | 'NETWORK')。
    const response = await postText(
      url,
      JSON.stringify(data === undefined ? { action } : { action, data }),
      {
        timeoutMs: TIMEOUT_MS,
      },
    )

    if (response.status < 200 || response.status >= 300) {
      throw httpError(response.status)
    }

    const text = response.text
    if (text.includes('<html')) {
      // 登录页/权限页与 401/403 是同一件事：用户要做的事与重试策略完全一样，共用一个码
      throw new CloudError('CLOUD_PERMISSION', msg.cloud.text.gasPermissionPage)
    }

    let json: Record<string, unknown>
    try {
      json = JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new CloudError('CLOUD_BAD_RESPONSE', msg.cloud.text.gasNotJson)
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
    // 11-8 的判据：超时与"发不出去"的重试方式、用户动作都一样 → 同一个码
    if (error instanceof CepError && error.code === 'TIMEOUT') {
      throw new CloudError('CLOUD_NETWORK', msg.cloud.text.syncTimeout)
    }
    throw new CloudError('CLOUD_NETWORK', error instanceof Error ? error.message : '同步网络失败')
  }
}

export async function pushSnapshot(snapshot: CloudSnapshot): Promise<void> {
  await callGateway('push_data', snapshot)
}

/**
 * 拉云端快照。**三态**：网络/权限/非 JSON 仍然抛 `CloudError`（既有语义不变）
 * 200 但结构不符返回 `{status:'unreadable'}` —— 由引擎决定"拒绝覆盖云端"，
 * 这里不替它判（ADR-0026 ②：原语只报观测）。
 */
export async function pullSnapshot(): Promise<CloudPullOutcome> {
  const response = await callGateway('pull_data')
  return normalizeCloudPayload(response)
}
