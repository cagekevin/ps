import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  okText?: string
  cancelText?: string
}

let resolver: ((value: boolean) => void) | null = null

/**
 * 命令式确认框。页面只调 `await confirm({...})`，
 * 不各自挂 CepModal、不各自管理 resolve。
 */
export const useConfirmStore = defineStore('confirm', () => {
  const visible = ref(false)
  const options = ref<ConfirmOptions>({ message: '' })

  function confirm(next: ConfirmOptions): Promise<boolean> {
    resolver?.(false)
    options.value = next
    visible.value = true
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  function resolve(value: boolean) {
    visible.value = false
    const done = resolver
    resolver = null
    done?.(value)
  }

  return { visible, options, confirm, resolve }
})
