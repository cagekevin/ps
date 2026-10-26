import { setAutoSyncEnabled, setCloudUrl } from '@/cep/cloud/config'
import { cloudEngine } from '@/cep/cloud/setup'
import { CepError, type CepErrorCode } from '@/utils/errors'
import type { CloudOutcome } from '@/cloud/types'
import { defineCommand } from './registry'
import type { Command } from './types'

/**
 * 引擎错误码 → 命令层码。
 *
 * **只列"用户该做什么不同"的**（阶段单 §四点三五 第 3 条）。云同步有 8 个 `CLOUD_*` 码，
 * 但命令层只有两个消费者按码分流：`useCommand` 的「取消不提示」和设置页的「未配置去填地址」。
 * 其余（冲突 / 写盘 / 读盘 / 解析 / 权限 / 网络）用户看到的都是**同一件事**：失败了、
 * 原因是什么——所以它们折成 `NETWORK`，而 `describeCepError` 对 NETWORK **原样透传 `e.message`**，
 * 引擎那句具体原因一个字都不丢（`tests/commands/cloud-codes.test.ts` 逐码钉住）。
 * 再往下细分＝造死码：没有任何人按它做不同的事。
 */
const COMMAND_CODE: Record<string, CepErrorCode> = {
  CLOUD_CANCELLED: 'CANCELLED',
  // `CLOUD_NOT_CONFIGURED` 以前映射成 INIT，于是"没填同步地址"被文案层说成
  // 「Photoshop 脚本初始化失败：未配置同步地址」——两件事没关系，用户会去查 PS 脚本。
  // INIT 也没有任何按码分流的消费者，所以它和其余码一样走 NETWORK + 原话透传。
}

/**
 * 云结果 → 命令结果。判据是 `status`（唯一判别位）：
 * `ok` / `skipped` 都不报错；`cancelled` 与 `error` 各自带 `failure`（码 + 原因原文）。
 */
function throwIfFailed(result: CloudOutcome): void {
  if (result.status === 'ok' || result.status === 'skipped') return
  // 只有「用户自己按的取消」不提示：`cancelled` 臂还可能带别的码（冲突未确认），那要报
  const code: CepErrorCode =
    result.status === 'cancelled' && result.failure.fail === 'CLOUD_CANCELLED'
      ? 'CANCELLED'
      : (COMMAND_CODE[result.failure.fail] ?? 'NETWORK')
  // 用户看到的是**引擎原话**，一个字不加；只有原话缺失时才退回码（那时也没有更好的话可说）
  throw new CepError(code, result.failure.reason ?? result.failure.fail)
}

export const cloudCommands: Command<unknown>[] = [
  defineCommand({
    id: 'cloud.setUrl',
    title: '设置云同步地址',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { url }) {
      setCloudUrl(url)
    },
  }),

  defineCommand({
    id: 'cloud.setAutoSync',
    title: '设置云同步自动同步',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { enabled }) {
      setAutoSyncEnabled(enabled)
    },
  }),

  defineCommand({
    id: 'cloud.upload',
    title: '上传本地预设',
    group: 'system',
    requires: 'none',
    kind: 'long',
    async invoke(_ctx, { force, onConfirm }) {
      const result = await cloudEngine.upload({ force, onConfirm })
      throwIfFailed(result)
    },
  }),

  defineCommand({
    id: 'cloud.download',
    title: '下载云端预设',
    group: 'system',
    requires: 'none',
    kind: 'long',
    async invoke(_ctx, { onConfirm }) {
      const result = await cloudEngine.download({ onConfirm })
      throwIfFailed(result)
    },
  }),
]
