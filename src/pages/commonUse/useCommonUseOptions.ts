import { ref, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCommand } from '@/components/command/useCommand'
import { useCommonUseStore } from '@/stores/common-use'

/**
 * 常用页设置项的读 + 写（页面私有）。
 *
 * 读：`stores/common-use.ts` 的 `options` 投影（`readCommonUseOptions` 的唯一出口在数据层）。
 * 写：`useCommand('commonUse.setOption')`，一条命令覆盖 12 个键（含 `cyExport.ext` 这类点路径）。
 *
 * 为什么要有这一层：面板里 20 多个控件都要"显示当前值 + 改了立刻落盘"，
 * 每个控件各写一遍 `:model-value` + `@update:model-value` 会出现 20 份一样的样板。
 */
export function useCommonUseOptions() {
  const store = useCommonUseStore()
  const { options } = storeToRefs(store)
  const setOptionCmd = useCommand('commonUse.setOption')

  async function set(path: string, value: unknown) {
    await setOptionCmd.run({ path, value })
    // 命令只写文件；读回来由投影负责（写成功后重读一次，失败时保留旧值、页面显示 toast）
    await store.loadOptions()
  }

  return { options, set }
}

/** 点路径取值：`cyExport.ext` → `options.cyExport.ext` */
export function readPath(source: Record<string, unknown>, path: string): unknown {
  let current: unknown = source
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

/**
 * 一个"跟着落盘值走"的本地 ref：初值取文件里的值，改动写回落盘，文件变了同步回来。
 *
 * 面板模板保持 `v-model="xxx"` 不变，所以控件本体不需要知道持久化存在。
 */
export function useOptionRef<T>(path: string, fallback: T): Ref<T> {
  const { options, set } = useCommonUseOptions()
  const current = ref<T>((readPath(options.value, path) ?? fallback) as T) as Ref<T>

  watch(
    options,
    (next) => {
      const disk = readPath(next, path)
      if (disk !== undefined && disk !== current.value) current.value = disk as T
    },
    { deep: true },
  )
  watch(current, (value) => {
    void set(path, value)
  })

  return current
}
