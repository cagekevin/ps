import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { CommandId, CommandPayloads } from '@/commands/payloads'
import { execute, get, isEnabled } from '@/commands/registry'
import type { Command } from '@/commands/types'
import { selectionRef } from '@/selection'
import { useFeedbackStore } from '@/stores/feedback'

export interface UseCommandResult<P> {
  command: Command<unknown> | undefined
  disabled: ComputedRef<boolean>
  running: Ref<boolean>
  run(payload?: P, successText?: string): Promise<boolean>
}

/**
 * 页面消费命令的唯一方式（ADR-16）。
 *
 * 传字面量 id 时 payload 类型由 `CommandPayloads` 推断，传错字段编译失败；
 * 传 string（如命令网格遍历注册表）时退化为 unknown。
 *
 * 失败自动 toast，调用方只拿 boolean——"拿到失败文案但不处理"写不出来。
 */
export function useCommand<K extends CommandId>(id: K): UseCommandResult<CommandPayloads[K]>
export function useCommand(id: string): UseCommandResult<unknown>
export function useCommand(id: string): UseCommandResult<unknown> {
  const feedback = useFeedbackStore()
  const command = get(id)
  const running = ref(false)
  // 依赖 selectionRef：命令执行前 refresh 会更新它，禁用态自动跟着变
  const disabled = computed(() => !command || !isEnabled(id, selectionRef.value))

  async function run(payload?: unknown, successText?: string): Promise<boolean> {
    if (running.value) return false
    running.value = true
    try {
      const result = await execute(id, payload)
      if (result.ok === true) {
        feedback.ok(successText ?? command?.title ?? '完成')
        return true
      }
      // cancelled 不提示；FONT_MISSING 交给页面弹窗；其余失败必须提示
      if (result.ok === false && result.code !== 'FONT_MISSING') {
        feedback.error(result.reason)
      }
      return false
    } finally {
      running.value = false
    }
  }

  return { command, disabled, running, run }
}
