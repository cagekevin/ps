import { defineStore } from 'pinia'
import { ref } from 'vue'
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

/** 装配层调用一次（`main.ts`）；测试里换成假源即可 */
export function provideCommonUseSource(next: CommonUseSource): void {
  source = next
}

function requireSource(): CommonUseSource {
  if (!source) throw new Error('常用页数据源未装配：main.ts 应先调 provideCommonUseSource')
  return source
}

export const useCommonUseStore = defineStore('common-use', () => {
  const tiles = ref<CommonUseTile[]>([])
  const collapsed = ref<Record<string, boolean>>({})
  const loading = ref(false)
  /** 非空表示读失败；页面内联显示 + 重试按钮 */
  const error = ref('')
  /** 非空表示读到的是降级数据（文件损坏），仍可渲染但要提示 */
  const degraded = ref('')

  function applyFile(file: CommonUseFile | null) {
    tiles.value = toTiles(file)
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

  const isCollapsed = (id: string): boolean => collapsed.value[id] === true

  return { tiles, collapsed, loading, error, degraded, load, loadCollapsed, isCollapsed }
})

let bound = false

/** 装配层调用一次（main.ts）：命令写成功后刷新只读投影 */
export function bindCommonUseData() {
  if (bound) return
  bound = true

  requireSource().onChange((value) => {
    useCommonUseStore().tiles = toTiles(value)
  })
}
