import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { CommandId, CommandPayloads } from '@/commands/payloads'
import { execute, get, isEnabled } from '@/commands/registry'
import type { Command } from '@/commands/types'
import { selectionRef } from '@/selection'
import { CODE_REGISTRY } from '@/utils/code-registry'
import { useFeedbackStore } from '@/stores/feedback'

export interface UseCommandOutcome<P> {
  command: Command<unknown> | undefined
  disabled: ComputedRef<boolean>
  running: Ref<boolean>
  invoke(payload?: P, successText?: string): Promise<boolean>
}

/**
 * 页面消费命令的唯一方式（ADR-16）。
 *
 * 传字面量 id 时 payload 类型由 `CommandPayloads` 推断，传错字段编译失败；
 * 传 string（如命令网格遍历注册表）时退化为 unknown。
 *
 * 失败自动 toast，调用方只拿 boolean——"拿到失败文案但不处理"写不出来。
 */
export function useCommand<K extends CommandId>(id: K): UseCommandOutcome<CommandPayloads[K]>
export function useCommand(id: string): UseCommandOutcome<unknown>
export function useCommand(id: string): UseCommandOutcome<unknown> {
  const feedback = useFeedbackStore()
  const command = get(id)
  const running = ref(false)
  // 依赖 selectionRef：命令执行前 refresh 会更新它，禁用态自动跟着变
  const disabled = computed(() => !command || !isEnabled(id, selectionRef.value))

  async function invoke(payload?: unknown, successText?: string): Promise<boolean> {
    if (running.value) return false
    running.value = true
    try {
      const result = await execute(id, payload)
      if (result.status === 'ok') {
        feedback.ok(successText ?? command?.title ?? '完成')
        return true
      }
      // 用户自己取消：什么都不弹（弹"失败"就是把他自己的选择报成故障）
      if (result.status === 'cancelled') return false
      // 是否 toast 由 `CODE_REGISTRY` 一张表决定（FONT_MISSING=false 交给页面弹窗）——
      // 不再 `code !== 'FONT_MISSING'` 硬编码（新增码漏在这里就会误弹/漏弹）
      if (result.status === 'error' && CODE_REGISTRY[result.fail].toast) {
        feedback.error(result.reason)
      }
      return false
    } finally {
      running.value = false
    }
  }

  return { command, disabled, running, invoke }
}
