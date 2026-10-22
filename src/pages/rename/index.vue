<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import BaseGroup from '@/components/BaseGroup.vue'
import CepModal from '@/components/CepModal.vue'
import CheckBox from '@/components/CheckBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import GButton from '@/components/GButton.vue'
import GDropdown from '@/components/GDropdown.vue'
import GInput from '@/components/GInput.vue'
import Icon from '@/components/Icon.vue'
import PageBottomBar from '@/components/PageBottomBar.vue'
import PageShell from '@/components/PageShell.vue'
import { useCommand } from '@/components/command/useCommand'
import { useDismiss } from '@/composables/useDismiss'
import { useFloatingPosition } from '@/composables/useFloatingPosition'
import { useLongPressDrag, type LongPressDragResult } from '@/composables/useLongPressDrag'
import { usePersistedRef } from '@/composables/usePersisted'
import {
  RENAME_LAYER_COLORS,
  RENAME_MARKS,
  buildReplaceExpression,
  checkExpression,
  insertMark,
  type RenameMark,
} from '@/domain/rename'
import { useFeedbackStore } from '@/stores/feedback'
import { useRenameStore } from '@/stores/rename'
import RenameModeTabs from './components/RenameModeTabs.vue'
import RenameSwatch from './components/RenameSwatch.vue'

/**
 * 重命名页（原版 `Rename`，render `BS()` app.v4.js:56474）。
 *
 * 三层分工：页面只发命令 + 渲染投影；规则在 `domain/rename.ts`；PS 与文件在 commands。
 * 表达式**求值在 PS 侧**（`cmm_batchName`），页面只传字符串——见 domain 里的 UNVERIFIED。
 */

/** 原版 switchdata（app.v4.js:56903） */
const MODES = ['默认', '替换']
/** 七色 + 清除，颜色值全部来自 tokens.css（原版 colorData :56905） */
const LAYER_COLORS = Array.from(
  { length: RENAME_LAYER_COLORS },
  (_, i) => `var(--c-layer-${i + 1})`,
)

const store = useRenameStore()
const feedback = useFeedbackStore()
const { preset, loading, error, degraded } = storeToRefs(store)

const batchNameCmd = useCommand('rename.batchName')
const setLayerColorCmd = useCommand('rename.setLayerColor')
const toggleGroupCmd = useCommand('rename.toggleGroup')
const addGroupCmd = useCommand('rename.addGroup')
const renameGroupCmd = useCommand('rename.renameGroup')
const deleteGroupCmd = useCommand('rename.deleteGroup')
const addItemCmd = useCommand('rename.addItem')
const changeItemCmd = useCommand('rename.changeItem')
const deleteItemCmd = useCommand('rename.deleteItem')
const reorderGroupCmd = useCommand('rename.reorderGroup')
const reorderItemCmd = useCommand('rename.reorderItem')
const exportPresetCmd = useCommand('rename.exportPreset')
const importPresetCmd = useCommand('rename.importPreset')

/** 原版 cmmSwitchindex / cmmShowColorSign（:56904/:56906，watch 里写回 :56921-56926） */
const switchIndex = usePersistedRef('cmmSwitchindex', 0)
const showColorSign = usePersistedRef('cmmShowColorSign', true)
/** 原版 isFilter 初值 true（:56917）；不持久化，与 `filterData` 单选项联动 */
const filterChildren = ref(true)
const filterOpen = ref(false)

const changeval = ref('')
const replaceText = ref('')
const newtext = ref('')
const inputWrap = ref<HTMLElement | null>(null)

// ---------- 执行重命名 ----------

async function runBatch(expression: string) {
  // 前置校验直接提示，不走命令（原版 checkVal，:57267）
  const message = checkExpression(expression)
  if (message) {
    feedback.error(message)
    return
  }
  await batchNameCmd.run({ expression, filterChildren: filterChildren.value })
}

function runRename() {
  void runBatch(changeval.value)
}

/** 替换模式：`替换文字=>新文字`（原版 :57264） */
function runReplace() {
  const message = checkExpression(replaceText.value)
  if (message) {
    feedback.error(message)
    return
  }
  void runBatch(buildReplaceExpression(replaceText.value, newtext.value))
}

/** 点预设 chip：先回填输入框，再直接执行（原版 chip 的 click 就是 useBatchRename(item)，:56670） */
function applyPreset(expression: string) {
  changeval.value = expression
  if (switchIndex.value !== 0) switchIndex.value = 0
  void runBatch(expression)
}

function pickColor(colorIndex: number) {
  void setLayerColorCmd.run({ colorIndex })
}

// ---------- 表达式菜单（点输入框弹出，原版 showTips :57073） ----------

const exprMenu = ref({ visible: false, x: 0, y: 0 })
const exprRef = ref<HTMLElement | null>(null)
const exprPoint = ref({ x: 0, y: 0 })
const { update: updateExprPosition } = useFloatingPosition({
  reference: exprPoint,
  floating: exprRef,
  placement: 'bottom-start',
})
useDismiss(
  () => exprMenu.value.visible,
  exprRef,
  () => {
    exprMenu.value.visible = false
  },
)

watch(
  () => exprMenu.value.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    updateExprPosition()
  },
)

function openExpressionMenu(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  // 原版是 offsetLeft+10 / offsetTop+32（:57114-57115），这里按输入框左上角定位
  exprPoint.value = { x: rect.left + 10, y: rect.top + 32 }
  exprMenu.value = { visible: true, x: rect.left, y: rect.top }
}

function pickMark(mark: RenameMark) {
  // 先删旧标记再插入（顺序见 domain/rename.ts 的 DEDUPE_ORDER）
  changeval.value = insertMark(changeval.value, mark)
  exprMenu.value.visible = false
  void nextTick(() => inputWrap.value?.querySelector('input')?.focus())
}

// ---------- 右键菜单（组 / 预设项）----------

type MenuKind = 'group' | 'item'
const menu = ref({
  visible: false,
  kind: 'group' as MenuKind,
  groupIndex: 0,
  itemIndex: -1,
})
const menuRef = ref<HTMLElement | null>(null)
const menuPoint = ref({ x: 0, y: 0 })
const { update: updateMenuPosition } = useFloatingPosition({
  reference: menuPoint,
  floating: menuRef,
  placement: 'bottom-start',
})
useDismiss(
  () => menu.value.visible,
  menuRef,
  () => {
    menu.value.visible = false
  },
)

watch(
  () => menu.value.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    updateMenuPosition()
  },
)

function openMenu(event: MouseEvent, kind: MenuKind, groupIndex: number, itemIndex = -1) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  menuPoint.value = { x: rect.left, y: rect.bottom + 2 }
  menu.value = { visible: true, kind, groupIndex, itemIndex }
}

/** 第 0 组没有右键菜单（原版 `e != 0` 才显示，:57058） */
function onGroupMenu(event: MouseEvent, groupIndex: number) {
  if (groupIndex <= 0) return
  openMenu(event, 'group', groupIndex)
}

// ---------- 弹层：新建/改名组、加/改预设 ----------

type ModalMode = 'createGroup' | 'renameGroup' | 'createItem' | 'changeItem'
const modal = ref({
  visible: false,
  mode: 'createGroup' as ModalMode,
  title: '新建分组',
  placeholder: '请输入组名',
  value: '',
  groupIndex: 0,
  itemIndex: -1,
})
const confirmState = ref({ visible: false, text: '', run: async () => {} })

function openModal(mode: ModalMode, options: { groupIndex?: number; itemIndex?: number } = {}) {
  menu.value.visible = false
  // -1 表示"不指定位置"：底条 ＋ 新建分组时追加到末尾（原版 addGroup() 不传下标，:56903）
  const groupIndex = options.groupIndex ?? -1
  const itemIndex = options.itemIndex ?? -1
  const current = preset.value[groupIndex]
  const config: Record<ModalMode, { title: string; placeholder: string; value: string }> = {
    createGroup: { title: '新建分组', placeholder: '请输入组名', value: '' },
    renameGroup: { title: '重命名分组', placeholder: '请输入新组名', value: current?.name ?? '' },
    createItem: { title: '添加预设', placeholder: '请输入预设文本', value: '' },
    changeItem: {
      title: '修改预设',
      placeholder: '请输入图层名或表达式',
      value: current?.list[itemIndex] ?? '',
    },
  }
  modal.value = { visible: true, mode, groupIndex, itemIndex, ...config[mode] }
}

async function submitModal() {
  const { mode, groupIndex, itemIndex, value } = modal.value
  if (mode === 'createGroup') {
    await addGroupCmd.run({ name: value, afterIndex: groupIndex >= 0 ? groupIndex : undefined })
  } else if (mode === 'renameGroup') await renameGroupCmd.run({ index: groupIndex, name: value })
  else if (mode === 'createItem') await addItemCmd.run({ groupIndex, text: value })
  else await changeItemCmd.run({ groupIndex, itemIndex, text: value })
}

function requestDelete(what: 'group' | 'item') {
  const { groupIndex, itemIndex } = menu.value
  menu.value.visible = false
  const group = preset.value[groupIndex]
  if (what === 'group') {
    confirmState.value = {
      visible: true,
      text: `删除分组「${group?.name ?? ''}」？组内预设会一起删除。`,
      run: async () => {
        await deleteGroupCmd.run({ index: groupIndex })
      },
    }
    return
  }
  confirmState.value = {
    visible: true,
    text: `删除预设「${group?.list[itemIndex] ?? ''}」？`,
    run: async () => {
      await deleteItemCmd.run({ groupIndex, itemIndex })
    },
  }
}

async function onConfirmDelete() {
  await confirmState.value.run()
}

// ---------- 拖拽排序（`am()` 机制，见 `composables/useLongPressDrag`）----------
//
// 照 `/style` 范本接线；两处额外限制来自台账 T-67 判据④：
// 「重命名页保留『第 0 组不可拖』……样式页没有这条，不要照搬」。
// 第 0 组是「最近使用」，固定组，既不能拖、也不能作为项落点。

type DragSlot =
  { kind: 'group'; groupIndex: number } | { kind: 'item'; groupIndex: number; itemIndex: number }

interface SlotTarget {
  element: HTMLElement
  slot: DragSlot
}

const drag = useLongPressDrag()
/** 滚动容器 + 落点查询根：`.rename-body` 是 `u-scroll` */
const bodyRef = ref<HTMLElement | null>(null)
/** 组拖拽期间折叠源组，照 `/style` 范本的 `dragCollapsed`；只影响视图 */
const dragCollapsed = ref(-1)
let dragSource: DragSlot | null = null
let dragTarget: DragSlot | null = null

/** 组落点：第 0 组不参与（台账 T-67 判据④「第 0 组不可拖」） */
function groupTargets(): SlotTarget[] {
  const root = bodyRef.value
  if (!root) return []
  const out: SlotTarget[] = []
  for (const element of root.querySelectorAll<HTMLElement>('.rename-group[data-drag-group]')) {
    const groupIndex = Number(element.dataset.dragGroup)
    if (Number.isInteger(groupIndex) && groupIndex > 0) {
      out.push({ element, slot: { kind: 'group', groupIndex } })
    }
  }
  return out
}

/**
 * 项落点：第 0 组不参与。
 *
 * UNVERIFIED: 判据④只点名「第 0 组不可拖」和「两处都判」，没有逐字说项拖拽的源/落点；
 * 这里沿用迁移前页面的行为（项也不能进出第 0 组），依据是判据④的「第 0 组不可拖」。
 */
function itemTargets(): SlotTarget[] {
  const root = bodyRef.value
  if (!root) return []
  const out: SlotTarget[] = []
  for (const element of root.querySelectorAll<HTMLElement>('[data-drag-item]')) {
    const groupIndex = Number(element.dataset.itemGroup)
    const itemIndex = Number(element.dataset.dragItem)
    if (!Number.isInteger(groupIndex) || groupIndex === 0 || !Number.isInteger(itemIndex)) continue
    out.push({ element, slot: { kind: 'item', groupIndex, itemIndex } })
  }
  return out
}

function onGroupMouseDown(event: MouseEvent, groupIndex: number) {
  // 第 0 组不可拖：连长按计时都不起（台账 T-67 判据④）
  if (groupIndex === 0) return
  dragSource = { kind: 'group', groupIndex }
  dragTarget = null

  let entries: SlotTarget[] = []
  const started = drag.start({
    event,
    node: event.currentTarget as HTMLElement,
    axis: 'y',
    scrollRoot: bodyRef.value,
    floatClass: 'rename-group--drag',
    targets: () => {
      entries = groupTargets()
      return entries.map((entry) => entry.element)
    },
    before: () => {
      dragCollapsed.value = groupIndex
    },
    onHover: (element) => {
      dragTarget = entries.find((entry) => entry.element === element)?.slot ?? null
    },
    onEnd: (result) => void endGroupDrag(result),
  })

  if (!started) dragSource = null
}

function onItemMouseDown(event: MouseEvent, groupIndex: number, itemIndex: number) {
  event.stopPropagation()
  // 第 0 组的项也不可拖（UNVERIFIED: 依据台账 T-67 判据④的「第 0 组不可拖」）
  if (groupIndex === 0) return
  dragSource = { kind: 'item', groupIndex, itemIndex }
  dragTarget = null

  let entries: SlotTarget[] = []
  const started = drag.start({
    event,
    node: event.currentTarget as HTMLElement,
    axis: 'x',
    targets: () => {
      entries = itemTargets()
      return entries.map((entry) => entry.element)
    },
    onHover: (element) => {
      dragTarget = entries.find((entry) => entry.element === element)?.slot ?? null
    },
    onEnd: (result) => void endItemDrag(result),
  })

  if (!started) dragSource = null
}

async function endGroupDrag(result: LongPressDragResult) {
  const source = dragSource
  const target = dragTarget
  dragSource = null
  dragTarget = null
  dragCollapsed.value = -1
  if (!source || !target || !result.dragged) return
  if (source.kind !== 'group' || target.kind !== 'group') return
  if (source.groupIndex === target.groupIndex) return

  await reorderGroupCmd.run({
    from: source.groupIndex,
    to: target.groupIndex,
    position: result.position,
  })
}

async function endItemDrag(result: LongPressDragResult) {
  const source = dragSource
  const target = dragTarget
  dragSource = null
  dragTarget = null
  if (!source || !target || !result.dragged) return
  if (source.kind !== 'item' || target.kind !== 'item') return
  // 落点也不能是第 0 组（UNVERIFIED: 依据台账 T-67 判据④的「第 0 组不可拖」）
  if (target.groupIndex === 0) return
  if (source.groupIndex === target.groupIndex && source.itemIndex === target.itemIndex) return

  await reorderItemCmd.run({
    fromGroup: source.groupIndex,
    fromIndex: source.itemIndex,
    toGroup: target.groupIndex,
    toIndex: target.itemIndex,
    position: result.position,
  })
}

function toggleGroup(index: number) {
  void toggleGroupCmd.run({ index })
}

async function exportPreset() {
  await exportPresetCmd.run(undefined, '导出成功')
}

async function importPreset() {
  await importPresetCmd.run(undefined, '导入成功')
}

onMounted(() => {
  void store.load()
})
</script>

<template>
  <!-- 原版这一页没有 header（.Rename 直接从 37px 顶条开始，app.v4.js:56478-56482），所以不传 title -->
  <PageShell class="rename-page">
    <RenameModeTabs v-model="switchIndex" :modes="MODES">
      <template #extra>
        <GDropdown v-model:visible="filterOpen" placement="bottom-end">
          <template #trigger>
            <!-- 原版 baseSvg 只有 .cursor.contextHover，无尺寸类 → 1em；色 #c3c3c3，hover 变白（:56504-56508） -->
            <button class="rename-filter" type="button" title="过滤子图层设置">
              <Icon name="#iconguolv" />
            </button>
          </template>
          <div class="rename-filter__panel">
            <CheckBox v-model="filterChildren">过滤子图层</CheckBox>
          </div>
        </GDropdown>
      </template>
    </RenameModeTabs>

    <div ref="bodyRef" class="rename-body u-fill u-scroll u-stack">
      <!-- 默认模式：一条表达式 + 应用按钮（原版 :56534-56579） -->
      <div
        v-if="switchIndex === 0"
        ref="inputWrap"
        class="rename-input"
        @click="openExpressionMenu"
      >
        <!-- 原版 baseInput 的 tips 就是 placeholder（app.v4.js:2675 `placeholder: t.tips`），
             这一处 tips="回车确认修改"（:56548），title="重命名图层"（:56544） -->
        <GInput
          v-model="changeval"
          placeholder="回车确认修改"
          title="重命名图层"
          @enter="runRename"
        >
          <template #suffix>
            <!-- 原版 baseIcon `.mr4.rename-svg` + hover="no"：无尺寸类 → 1em，色 #666 / hover #ddd（:56570-56579） -->
            <button class="rename-apply" type="button" title="重命名图层" @click.stop="runRename">
              <Icon name="#iconyingyong" />
            </button>
          </template>
        </GInput>
      </div>

      <!-- 替换模式：替换文字 + 新文字（原版 :56588-56620） -->
      <div v-else class="rename-input rename-input--replace">
        <GInput v-model="replaceText" placeholder="替换文字" @enter="runReplace" />
        <GInput v-model="newtext" placeholder="新文字" @enter="runReplace" />
      </div>

      <p v-if="loading" class="rename-hint">加载中…</p>

      <div v-else-if="error" class="rename-error">
        <p class="rename-error__text">{{ error }}</p>
        <GButton size="small" @click="store.load()">重试</GButton>
      </div>

      <EmptyState
        v-else-if="!preset.length"
        compact
        class="rename-hint"
        text="还没有重命名预设，点下方 ＋ 新建分组。"
      />

      <template v-else>
        <p v-if="degraded" class="rename-hint">{{ degraded }}，预设可能不完整</p>

        <section
          v-for="(group, groupIndex) in preset"
          :key="`${group.name}-${groupIndex}`"
          class="rename-group"
          :data-drag-group="groupIndex"
          @mousedown="onGroupMouseDown($event, groupIndex)"
        >
          <BaseGroup
            :text="group.name"
            :value="group.show && dragCollapsed !== groupIndex"
            @change="toggleGroup(groupIndex)"
            @menu="onGroupMenu($event, groupIndex)"
          >
            <div class="rename-chips">
              <button
                v-for="(item, itemIndex) in group.list"
                :key="`${item}-${itemIndex}`"
                class="rename-chip"
                type="button"
                :title="item"
                :data-item-group="groupIndex"
                :data-drag-item="itemIndex"
                @click="applyPreset(item)"
                @contextmenu.prevent="openMenu($event, 'item', groupIndex, itemIndex)"
                @mousedown="onItemMouseDown($event, groupIndex, itemIndex)"
              >
                {{ item }}
              </button>
              <button
                v-if="groupIndex > 0"
                class="rename-chip rename-chip--add"
                type="button"
                title="添加预设"
                @click="openModal('createItem', { groupIndex })"
              >
                <!-- 原版 baseSvg 带 .svg-14 → 14px（:56694-56698），对应 size="sm" -->
                <Icon name="#iconchuangjian" size="sm" />
              </button>
            </div>
            <EmptyState v-if="!group.list.length" compact text="该组还没有预设" />
          </BaseGroup>
        </section>
      </template>

      <hr class="rename-divider" />

      <!-- 图层颜色标记（原版 baseOpen + colorButton，:56709-56760） -->
      <BaseGroup text="图层颜色标记" :value="showColorSign" @change="showColorSign = $event">
        <div class="rename-colors">
          <RenameSwatch
            v-for="(color, index) in LAYER_COLORS"
            :key="color"
            :color="color"
            title="设置图层颜色"
            @pick="pickColor(index + 1)"
          />
          <RenameSwatch title="清除图层颜色" clear @pick="pickColor(0)" />
        </div>
      </BaseGroup>
    </div>

    <!-- 底栏走公共 PageBottomBar（原版 .reanme-bottom 26px + #535353，:56761）；
         按钮皮肤由 PageBottomBar 的全局类提供，本页不再写一份 -->
    <PageBottomBar>
      <button
        class="g-bottom-bar__icon"
        type="button"
        title="添加分组"
        @click="openModal('createGroup')"
      >
        <Icon name="#iconxinjiandongzuofenzu" />
      </button>
      <span class="g-bottom-bar__divider" />
      <button class="g-bottom-bar__icon" type="button" title="导入预设" @click="importPreset">
        <Icon name="#icondaoru" />
      </button>
      <button class="g-bottom-bar__icon" type="button" title="导出预设" @click="exportPreset">
        <Icon name="#icondaochu" />
      </button>
    </PageBottomBar>

    <!-- 表达式菜单（原版 $menu.show，:57094-57112） -->
    <ul v-if="exprMenu.visible" ref="exprRef" class="rename-menu">
      <li v-for="option in RENAME_MARKS" :key="option.mark">
        <button class="rename-menu__item" type="button" @click="pickMark(option.mark)">
          {{ option.text }}
        </button>
      </li>
    </ul>

    <!-- 组 / 预设项右键菜单（组 0 只有「创建新组」，原版 splice(1,3)，:57213） -->
    <ul v-if="menu.visible" ref="menuRef" class="rename-menu">
      <template v-if="menu.kind === 'group'">
        <li>
          <button
            class="rename-menu__item"
            type="button"
            @click="openModal('createGroup', { groupIndex: menu.groupIndex })"
          >
            创建新组
          </button>
        </li>
        <template v-if="menu.groupIndex > 0">
          <li>
            <button
              class="rename-menu__item"
              type="button"
              @click="openModal('renameGroup', { groupIndex: menu.groupIndex })"
            >
              重命名
            </button>
          </li>
          <li>
            <button class="rename-menu__item" type="button" @click="requestDelete('group')">
              删除
            </button>
          </li>
        </template>
      </template>
      <template v-else>
        <li>
          <button
            class="rename-menu__item"
            type="button"
            @click="
              openModal('changeItem', { groupIndex: menu.groupIndex, itemIndex: menu.itemIndex })
            "
          >
            修改
          </button>
        </li>
        <li>
          <button class="rename-menu__item" type="button" @click="requestDelete('item')">
            删除
          </button>
        </li>
      </template>
    </ul>

    <CepModal v-model:visible="modal.visible" :title="modal.title" @ok="submitModal">
      <GInput v-model="modal.value" :placeholder="modal.placeholder" @enter="submitModal" />
    </CepModal>

    <CepModal v-model:visible="confirmState.visible" title="确认删除" @ok="onConfirmDelete">
      <p>{{ confirmState.text }}</p>
    </CepModal>
  </PageShell>
</template>

<style scoped>
/* 原版每段都用全局 `.app-padding,.more-content{padding:0 10px}`（输入区 :56533、分组 :56647、
   色块区 :56708）。这里只在本页给 10px，不动全局 --page-pad-x（那是给别的页的）。
   底栏的 26px / #535353 / 左右 10px 都在 PageBottomBar 里，本页不再写。 */
.rename-body {
  gap: var(--sp-3);
  padding: 0 var(--sp-exact-10) var(--sp-4);
}

/* 原版 .app-padding.mt10（:56533）：上下由 mt10 给，左右已由 .rename-body 给 */
.rename-input {
  padding-top: var(--sp-exact-10);
}

.rename-input--replace {
  display: flex;
  gap: var(--sp-exact-10);
}

/* 原版 .rename-svg .icon{color:#666}（scoped data-v-2d612e86）；图标 1em 跟随字号 */
.rename-apply {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-icon-muted);
  cursor: pointer;
}

/* 原版 .rename-svg .icon:hover{color:#ddd} */
.rename-apply:hover {
  color: var(--c-icon-muted-hover);
}

.rename-hint {
  margin: 0;
  padding: var(--sp-3) 0;
  color: var(--text-dim);
  font-size: var(--fs-md);
}

.rename-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
}

.rename-error__text {
  margin: 0;
  color: var(--danger);
  font-size: var(--fs-md);
}

.rename-group {
  width: 100%;
}

/* 组拖拽浮层皮肤 —— 照 `/style` 范本的 `.style-group--drag`（`pages/style/index.css`）。
   UNVERIFIED: 重命名页这份 floatStyle 的具体值没有判据可依，本机无同版本原版源码可复核；
   先沿用范本的 200×24、强调色、4px 圆角。
   `position/left/top/z-index` 由 `useLongPressDrag` 的 `follow()` 内联给，这里只写皮肤。 */
.rename-group--drag {
  width: 200px;
  height: var(--h-control-sm);
  border-radius: var(--r-md);
  background-color: var(--c-accent);
  line-height: var(--h-control-sm);
}

/* 原版 .btn-small{height:26px;line-height:26px;padding:0 6px;border-radius:5px}；
   项间距原版用 margin-right:6px/margin-bottom:5px，这里换成父级 gap */
.rename-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-exact-5) var(--sp-3);
  margin-top: var(--sp-3);
}

.rename-chip {
  display: inline-flex;
  max-width: 100%;
  height: var(--h-row);
  align-items: center;
  padding: 0 var(--sp-3);
  border: 0;
  border-radius: var(--r-input);
  background: var(--c-font-btn);
  color: var(--text);
  font-size: var(--fs-md);
  line-height: var(--h-row);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rename-chip:hover {
  background: var(--c-font-btn-hover);
}

/* 原版 .iconFun{width:36px;margin:0} */
.rename-chip--add {
  width: 36px;
  justify-content: center;
}

.rename-divider {
  width: calc(100% - 30px);
  height: 1px;
  margin: var(--sp-exact-5) auto;
  padding: 0;
  border: none;
  background: var(--c-divider);
}

.rename-colors {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-exact-5);
  margin-top: var(--sp-3);
}

/* 原版 baseSvg `.cursor.contextHover`：图标走全局 .icon 的 #c3c3c3，
   hover 才变白（.contextHover:hover{color:#fff} + /deep/ .icon{fill:#fff}） */
.rename-filter {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.rename-filter:hover {
  color: var(--c-text-inverse);
}

.rename-filter__panel {
  padding: var(--sp-3) var(--sp-4);
}

/* 浮动菜单：原版 $menu 的浮层外观（.dropDown-wrap background rgba(64,64,64,.95)） */
.rename-menu {
  position: fixed;
  top: var(--floating-y, 0);
  left: var(--floating-x, 0);
  z-index: var(--z-dropdown);
  min-width: 168px;
  margin: 0;
  padding: var(--sp-3) 0;
  list-style: none;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}

.rename-menu__item {
  display: flex;
  width: 100%;
  height: var(--h-control);
  align-items: center;
  padding: 0 var(--sp-5);
  border: 0;
  background: transparent;
  color: var(--text-strong);
  font-size: var(--fs-md);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.rename-menu__item:hover {
  background: var(--c-hover-2);
}
</style>
