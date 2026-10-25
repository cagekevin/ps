import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCommand } from '@/components/command/useCommand'
import { msg } from '@/domain/messages'
import type { FreePanelItemInput } from '@/commands/payloads'
import { useFreePanelStore } from '@/stores/free-panel'

/**
 * “把按钮加入自由面板”的统一适配器。
 *
 * 所有页面只负责构造 FreePanelItemInput，不各写一套区域选择/命令调用。
 */
export function useFreePanelAdd() {
  const store = useFreePanelStore()
  const { blocks } = storeToRefs(store)
  const addCmd = useCommand('freePanel.add')

  const visible = ref(false)
  const title = ref('请选择区域')
  const items = ref<FreePanelItemInput[]>([])

  function open(nextItems: FreePanelItemInput[], nextTitle = '请选择区域'): boolean {
    if (!nextItems.length) return false
    items.value = nextItems
    title.value = nextTitle
    visible.value = true
    void store.load()
    return true
  }

  async function confirm(blockId: number): Promise<boolean> {
    if (!items.value.length) return false
    const ok = await addCmd.invoke(
      { blockId, items: items.value },
      items.value.length === 1
        ? msg.command.fn.addedToFreePanel(items.value[0].text)
        : msg.command.fn.addedNActions(String(items.value.length)),
    )
    if (ok) visible.value = false
    return ok
  }

  return { visible, title, items, blocks, open, confirm }
}
