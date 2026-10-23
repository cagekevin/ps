import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readCommonUseOptions } from '@/cep/data/legacy-settings'
import { getCommonUseCollapsed } from '@/cep/data/settings'
import { toTiles, type CommonUseFile, type CommonUseTile } from '@/domain/common-use'
import { describeCepError } from '@/utils/error-text'

/**
 * 常用页的**只读投影**：落盘文件 + 折叠态 → 页面渲染用的形状。
 *
 * 写操作全在 `commands/commonUse.ts`（`setShow` / `move` / `setCollapsed` / 各功能命令）。
 * 这里不 import 任何仓库/写入口：数据源经 `provideCommonUseSource` 注入，端口只有
 * `read` / `onChange` 两个方法——**拿不到写入口，就不可能顺手改数据**（装配在 `main.ts`）。
 */
export interface CommonUseSource {
  read(): Promise<{ value: CommonUseFile | null; degraded?: string }>
  onChange(listener: (value: CommonUseFile) => void): () => void
}

let source: CommonUseSource | null = null
let unsubscribe: (() => void) | null = null

/**
 * 装配层调用一次（`main.ts`）：注入数据源**并**接上刷新订阅——两件事本来就是一件事
 * （有源才有事件），拆成两个函数只会多一个"注入了但没订阅"的半装状态。
 * 重复调用（测试换源）会先退掉旧订阅。
 */
export function installCommonUseSource(next: CommonUseSource): void {
  source = next
  unsubscribe?.()
  unsubscribe = next.onChange((value) => {
    useCommonUseStore().tiles = toTiles(value)
  })
}

function requireSource(): CommonUseSource {
  if (!source) throw new Error('常用页数据源未装配：main.ts 应先调 provideCommonUseSource')
  return source
}

export const useCommonUseStore = defineStore('common-use', () => {
  const tiles = ref<CommonUseTile[]>([])
  const collapsed = ref<Record<string, boolean>>({})
  /** 子面板参数投影（sj_set.json 的 12 个 cy* 键）；写走 commonUse.setOption */
  const options = ref<Record<string, unknown>>({})
  const loading = ref(false)
  /** 非空表示读失败；页面内联显示 + 重试按钮 */
  const error = ref('')
  /** 非空表示读到的是降级数据（文件损坏），仍可渲染但要提示 */
  const degraded = ref('')

  function applyFile(file: CommonUseFile | null) {
    tiles.value = toTiles(file)
  }

  /** 读子面板参数（`sj_set.json` 的 12 个 cy* 键）；命令写成功后由页面重读一次 */
  async function loadOptions() {
    const read = await readCommonUseOptions()
    options.value = read.value as Record<string, unknown>
  }

  /** 折叠态是同步偏好（`sj_v5_ui.json`），不参与 loading/error */
  function loadCollapsed() {
    collapsed.value = getCommonUseCollapsed()
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const read = await requireSource().read()
      applyFile(read.value)
      degraded.value = read.degraded ?? ''
    } catch (e) {
      error.value = describeCepError(e)
      applyFile(null)
      degraded.value = ''
    } finally {
      loading.value = false
    }
  }

  return { tiles, collapsed, options, loading, error, degraded, load, loadOptions, loadCollapsed }
})
