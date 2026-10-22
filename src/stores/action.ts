import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  actionIndexRepo,
  actionLibraryRepo,
  currentWarehouseFile,
  selectActionFile,
} from '@/cep/data/actions'
import { getRawActionList } from '@/cep/ps'
import { getPref } from '@/cep/data/settings'
import { readActionList, type ActionGroup, type ActionWarehouse } from '@/domain/action'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'

/**
 * 动作库的只读投影。
 *
 * 写操作全部在 `commands/action.ts`；这里只负责"读索引 → 切文件 → 读库"。
 * 切换仓库时 `selectActionFile` 改变仓库实例的 resolvePath，下一次 `read` 即生效。
 */
export const useActionStore = defineStore('action', () => {
  const warehouses = ref<ActionWarehouse[]>([])
  const activeIndex = ref(0)
  const groups = ref<ActionGroup[]>([])
  /** 原版 dzShowListType 0/1/2；这里投影成 1/2/3 列 */
  const listType = ref(getPref('dzShowListType', 2) + 1)
  /** 非空表示当前读到的不是真实数据（索引/库损坏），页面必须提示 */
  const degraded = ref('')

  async function load() {
    const index = await actionIndexRepo.read()
    warehouses.value = index.value.list
    activeIndex.value = index.value.index
    degraded.value = index.degraded ?? ''

    selectActionFile(currentWarehouseFile(index.value))

    const library = await actionLibraryRepo.read()
    groups.value = library.value
    if (library.degraded) degraded.value = library.degraded
  }

  // ── "从 Photoshop 添加"弹层的数据源（读，不是命令） ──────────────────
  const psGroups = ref<ActionGroup[]>([])
  const psLoading = ref(false)
  const psUnparsed = ref(false)
  /** 非空表示读取失败，弹层内联显示（不走 toast：这是页面级加载失败） */
  const psError = ref('')

  async function loadPsActions() {
    psLoading.value = true
    psError.value = ''
    psUnparsed.value = false
    psGroups.value = []

    try {
      const raw = await getRawActionList()
      const read = readActionList(raw)
      psGroups.value = read.groups
      // 有分组但一个动作都没解析出来，说明 children 形状没适配，不能当成“空动作”
      psUnparsed.value = read.shape === 'unknown' || (read.received > 0 && read.actions === 0)

      if (psUnparsed.value) {
        log.warn(
          'action',
          `dz_getActionList 返回结构无法识别（shape=${read.shape}, received=${read.received}, actions=${read.actions}）`,
          raw,
        )
      }
    } catch (e) {
      psError.value = describeCepError(e)
      log.error('action', '读取 Photoshop 动作失败', e)
    } finally {
      psLoading.value = false
    }
  }

  return {
    warehouses,
    activeIndex,
    groups,
    listType,
    degraded,
    load,
    psGroups,
    psLoading,
    psUnparsed,
    psError,
    loadPsActions,
  }
})

let bound = false

/** 装配层调用一次（main.ts）：命令写成功后刷新只读投影 */
export function bindActionData() {
  if (bound) return
  bound = true

  actionLibraryRepo.onChange((value) => {
    useActionStore().groups = value
  })
  actionIndexRepo.onChange((value) => {
    const store = useActionStore()
    store.warehouses = value.list
    store.activeIndex = value.index
    selectActionFile(currentWarehouseFile(value))
  })
}
