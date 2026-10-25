import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { readCommonUseOptions } from '@/cep/data/legacy-settings'
import type { RepoRead } from '@/cep/data/types'
import { getCommonUseCollapsed } from '@/cep/data/settings'
import { toTiles, type CommonUseFile, type CommonUseTile } from '@/domain/common-use'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'

/**
 * 常用页的**只读投影**：落盘文件 + 折叠态 → 页面渲染用的形状。
 *
 * 写操作全在 `commands/commonUse.ts`（`setShow` / `move` / `setCollapsed` / 各功能命令）。
 * 这里不 import 任何仓库/写入口：数据源经 `provideCommonUseSource` 注入，端口只有
 * `read` / `onChange` 两个方法——**拿不到写入口，就不可能顺手改数据**（装配在 `main.ts`）。
 */
export interface CommonUseSource {
  /** 用 `RepoRead`：以前这里自声明了一份 `{ value, degraded }` 的第三份同义形状（T-101-0 P 类） */
  read(): RepoRead<CommonUseFile | null>
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
  /** 子面板参数 + 区域显隐投影（sj_set.json 的 17 个 cy* 键）；写走 commonUse.setOption */
  const options = ref<Record<string, unknown>>({})
  const loading = ref(false)
  /** 非空表示读失败；页面内联显示 + 重试按钮 */
  const error = ref('')
  /**
   * 两个来源各自的原因，合成一个 `degraded`：
   * `tiles` 读 `sj_commonFunction.json`，`options` 读 `sj_set.json`——**两个文件**，
   * 后跑的那个不许把前一个的原因抹掉（T-101-1 之前 `loadOptions` 的坏因整个丢掉）。
   */
  const reasons = ref({ tiles: '', options: '' })
  /** 非空表示读到的是降级数据（文件损坏），仍可渲染但要提示 */
  const degraded = computed(() =>
    [reasons.value.tiles, reasons.value.options].filter(Boolean).join('；'),
  )

  function applyFile(file: CommonUseFile | null) {
    tiles.value = toTiles(file)
  }

  /** 读子面板参数（`sj_set.json` 的 17 个 cy* 键）；命令写成功后由页面重读一次 */
  async function loadOptions() {
    const read = await readCommonUseOptions()
    // 坏 sj_set.json → 17 个键全缺：必须进 `degraded` 让页面提示，否则用户以为设置被清了（T-101-1）。
    // 默认值取生产者给的 `fallback`（`legacySettingsRepo` 的 `{}` 经 `pickCommonUseOptions` 归一），
    // 消费侧不另写一份空对象（T-104 / ADR-24）
    options.value = read.ok ? read.value : read.fallback
    reasons.value.options = read.reason ?? ''
    if (!read.ok) {
      log.error('common-use', `常用页设置读取失败，子面板参数按缺省显示：${read.reason}`)
    }
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
      // 坏读的默认值取生产者给的 `fallback`（`commonUseRepo` 的 `createEmptyCommonUseFile()` 就是 `[]`，
      // `common-use.ts:31-36`）——`toTiles([])` 与旧写法 `toTiles(null)` 逐项同结果（T-104）
      applyFile(read.ok ? read.value : read.fallback)
      reasons.value.tiles = read.reason ?? ''
    } catch (e) {
      error.value = describeCepError(e)
      applyFile(null)
      reasons.value.tiles = ''
    } finally {
      loading.value = false
    }
  }

  return { tiles, collapsed, options, loading, error, degraded, load, loadOptions, loadCollapsed }
})
