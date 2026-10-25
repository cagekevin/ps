import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  actionIndexRepo,
  actionLibraryRepo,
  currentWarehouseFile,
  defaultActionIndex,
  getRawActionList,
  selectActionFile,
} from '@/cep/data/actions'
import { getPref } from '@/cep/data/settings'
import { msg } from '@/domain/messages'
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
  /** 原版 dzShowListType 0/1/2；这里投影成 1/2/3 列。**不导出**：对外只有下面的只读投影 */
  const listTypeColumns = ref(getPref('dzShowListType', 2) + 1)

  /**
   * 列数投影的对外出口，**只读**（TD-03-3）。
   *
   * 导出 `computed` 而不是 `ref`：`storeToRefs` 对只读 getter 给的是 `ComputedRef`，
   * 页面写 `listType.value = …` 时 `vue-tsc` 直接报只读属性——判据有执行者，
   * 不再靠"页面记得别赋值"这句注释（TD-03-2 那版只是约定，改回去测试照样绿）。
   */
  const listType = computed(() => listTypeColumns.value)

  /**
   * 列数投影的**唯一写入口**（TD-03-2）。
   *
   * 以前页面从 `storeToRefs` 拿到 `listType` 就直接 `.value = columns`——页面替 store
   * 决定投影怎么变，store 自己没有写入口，第二个页面要用时又会各写一遍。
   *
   * 落盘不在这里：`dzShowListType` 由命令 `action.setListType` 写（store 只读数据层，
   * 方向不变）；本函数只管本 store 的投影，调用方是"命令成功之后"的页面。
   */
  function setListType(columns: 1 | 2 | 3) {
    listTypeColumns.value = columns
  }
  /** 非空表示当前读到的不是真实数据（索引/库损坏），页面必须提示 */
  const degraded = ref('')

  async function load() {
    const index = actionIndexRepo.read()
    // 坏索引没有 value（判别联合）：显式回退到生产者自己的默认索引，并把"当前显示的是默认仓库"
    // 同时写进提示与日志——不许静默拿默认值冒充用户的仓库（T-101-1 / T-101-2）
    const indexValue = index.ok ? index.value : defaultActionIndex()
    warehouses.value = indexValue.list
    activeIndex.value = indexValue.index

    const reasons: string[] = []
    const indexFile = currentWarehouseFile(indexValue)
    if (!index.ok) {
      reasons.push(msg.data.fn.actionIndexCorruptDefault(index.reason, indexFile))
      log.error('action', `索引损坏，已回退默认仓库 ${indexFile}`, index.reason)
    }
    selectActionFile(indexFile)

    const library = actionLibraryRepo.read()
    // 坏库的默认值取生产者给的 `fallback`（`actionLibraryRepo` 构造时传的 `() => []`，`actions.ts:75-79`），
    // 消费侧不另写一份空数组（T-104 / ADR-24）
    groups.value = library.ok ? library.value : library.fallback
    if (!library.ok) reasons.push(msg.data.fn.actionLibraryCorrupt(library.reason))
    degraded.value = reasons.join('；')
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

  /**
   * 数据投影的**唯一写入口**（供 `bindActionData` 的 `onChange` 调用）。
   *
   * 对外只导出 `readonly` 投影 —— 页面/组件想直改会 TS 报错（结构上不可能），
   * 要改只能走这里或 `load()`。以前 `bindActionData` 从外部 `store.groups = value`，
   * 逼得投影必须是可写 `ref`（谁都能改，绕过 store 的更新逻辑）。
   */
  function applyLibrary(value: ActionGroup[]): void {
    groups.value = value
    // 写成功 ⇒ 刚写下去的这份是合法的，之前"索引/库损坏"的降级提示该清
    degraded.value = ''
  }

  function applyIndex(value: { list: ActionWarehouse[]; index: number }): void {
    warehouses.value = value.list
    activeIndex.value = value.index
    selectActionFile(currentWarehouseFile(value))
    degraded.value = ''
  }

  // ── 对外**只给用途**，不给内部字段（深模块：窄接口） ──────────────────
  // 以前导出 `warehouses` + `activeIndex` 两个裸 ref，页面只好自己
  // `computed(() => ({ index: activeIndex.value, list: warehouses.value }))` ——
  // 那是页面在做 store 的事，而且内部表示一改（如改成 activeWarehouse）就全炸。

  /** 仓库下拉的视图模型（页面直接 `:data="store.warehouseView"`，不再自己拼） */
  const warehouseView = computed(() => ({ index: activeIndex.value, list: warehouses.value }))

  /** 按序取仓库名（页面不再摸 `warehouses` 数组） */
  function warehouseName(index: number): string {
    return warehouses.value[index]?.name ?? ''
  }

  /** 第 `index` 个是不是当前选中的（页面不再读 `activeIndex`） */
  function isActiveWarehouse(index: number): boolean {
    return index === activeIndex.value
  }

  return {
    warehouseView,
    warehouseName,
    isActiveWarehouse,
    groups,
    listType,
    setListType,
    degraded,
    load,
    psGroups,
    psLoading,
    psUnparsed,
    psError,
    loadPsActions,
    applyLibrary,
    applyIndex,
  }
})

let bound = false

/** 装配层调用一次（main.ts）：命令写成功后刷新只读投影 */
export function bindActionData() {
  if (bound) return
  bound = true

  // 投影是 `readonly`（外部改不了）⇒ 写只能走 store 自己的 `apply*` 方法
  actionLibraryRepo.onChange((value) => {
    useActionStore().applyLibrary(value)
  })
  actionIndexRepo.onChange((value) => {
    useActionStore().applyIndex(value)
  })
}
