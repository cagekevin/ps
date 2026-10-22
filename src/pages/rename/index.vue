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
import PageShell from '@/components/PageShell.vue'
import { useCommand } from '@/components/command/useCommand'
import { useDismiss } from '@/composables/useDismiss'
import { useFloatingPosition } from '@/composables/useFloatingPosition'
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
const { style: exprStyle, update: updateExprPosition } = useFloatingPosition({
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
const { style: menuStyle, update: updateMenuPosition } = useFloatingPosition({
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

// ---------- 拖拽排序 ----------

const dragGroup = ref<number | null>(null)
const dragItem = ref<{ groupIndex: number; itemIndex: number } | null>(null)

function onGroupDragStart(event: DragEvent, index: number) {
  if (index === 0) return
  dragGroup.value = index
  event.dataTransfer?.setData('text/plain', `group:${index}`)
}

function onGroupDrop(event: DragEvent, index: number) {
  event.preventDefault()
  const from = dragGroup.value
  dragGroup.value = null
  if (from === null || from === index) return
  void reorderGroupCmd.run({ from, to: index })
}

function onItemDragStart(event: DragEvent, groupIndex: number, itemIndex: number) {
  // 第 0 组（最近使用）不参与拖动，与组一样固定
  if (groupIndex === 0) return
  dragItem.value = { groupIndex, itemIndex }
  event.stopPropagation()
  event.dataTransfer?.setData('text/plain', `item:${groupIndex}:${itemIndex}`)
}

function onItemDrop(event: DragEvent, groupIndex: number, itemIndex: number) {
  event.preventDefault()
  event.stopPropagation()
  const from = dragItem.value
  dragItem.value = null
  if (!from || groupIndex === 0) return
  if (from.groupIndex === groupIndex && from.itemIndex === itemIndex) return
  void reorderItemCmd.run({
    fromGroup: from.groupIndex,
    fromIndex: from.itemIndex,
    toGroup: groupIndex,
    toIndex: itemIndex,
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
  <PageShell title="重命名" class="rename-page">
    <template #footer>
      <button
        class="rename-bottom__icon"
        type="button"
        title="添加分组"
        @click="openModal('createGroup')"
      >
        <Icon name="#iconxinjiandongzuofenzu" size="md" />
      </button>
      <span class="rename-bottom__divider" />
      <button class="rename-bottom__icon" type="button" title="导入预设" @click="importPreset">
        <Icon name="#icondaoru" size="md" />
      </button>
      <button class="rename-bottom__icon" type="button" title="导出预设" @click="exportPreset">
        <Icon name="#icondaochu" size="md" />
      </button>
    </template>

    <RenameModeTabs v-model="switchIndex" :modes="MODES">
      <template #extra>
        <GDropdown v-model:visible="filterOpen" placement="bottom-end">
          <template #trigger>
            <button class="rename-filter" type="button" title="过滤子图层设置">
              <Icon name="#iconguolv" size="sm" />
            </button>
          </template>
          <div class="rename-filter__panel">
            <CheckBox v-model="filterChildren">过滤子图层</CheckBox>
          </div>
        </GDropdown>
      </template>
    </RenameModeTabs>

    <div class="rename-body u-fill u-scroll u-stack">
      <!-- 默认模式：一条表达式 + 应用按钮（原版 :56534-56579） -->
      <div
        v-if="switchIndex === 0"
        ref="inputWrap"
        class="rename-input"
        @click="openExpressionMenu"
      >
        <GInput v-model="changeval" placeholder="请输入图层名或表达式" @enter="runRename">
          <template #suffix>
            <button class="rename-apply" type="button" title="重命名图层" @click.stop="runRename">
              <Icon name="#iconyingyong" size="sm" />
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
          :draggable="groupIndex > 0"
          @dragstart="onGroupDragStart($event, groupIndex)"
          @dragover.prevent
          @drop="onGroupDrop($event, groupIndex)"
        >
          <BaseGroup
            :text="group.name"
            :value="group.show"
            @change="toggleGroup(groupIndex)"
            @menu="onGroupMenu($event, groupIndex)"
          >
            <div class="rename-chips">
              <button
                v-for="(item, itemIndex) in group.list"
                :key="`${item}-${itemIndex}`"
                class="rename-chip"
                :draggable="groupIndex > 0"
                type="button"
                :title="item"
                @click="applyPreset(item)"
                @contextmenu.prevent="openMenu($event, 'item', groupIndex, itemIndex)"
                @dragstart="onItemDragStart($event, groupIndex, itemIndex)"
                @dragover.prevent
                @drop="onItemDrop($event, groupIndex, itemIndex)"
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
                <Icon name="#iconchuangjian" size="xs" />
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

    <!-- 表达式菜单（原版 $menu.show，:57094-57112） -->
    <ul v-if="exprMenu.visible" ref="exprRef" class="rename-menu" :style="exprStyle">
      <li v-for="option in RENAME_MARKS" :key="option.mark">
        <button class="rename-menu__item" type="button" @click="pickMark(option.mark)">
          {{ option.text }}
        </button>
      </li>
    </ul>

    <!-- 组 / 预设项右键菜单（组 0 只有「创建新组」，原版 splice(1,3)，:57213） -->
    <ul v-if="menu.visible" ref="menuRef" class="rename-menu" :style="menuStyle">
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
/* 底条沿用 PageShell footer：26px + 原版底色 #535353（.reanme-bottom，:56761） */
.rename-page {
  --shell-footer-height: var(--h-row);
  --shell-footer-bg: var(--c-footbar);
}

.rename-body {
  gap: var(--sp-3);
  padding: 0 var(--page-pad-x) var(--sp-4);
}

.rename-input {
  padding-top: var(--sp-exact-10);
}

.rename-input--replace {
  display: flex;
  gap: var(--sp-exact-10);
}

.rename-apply {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
}

.rename-apply:hover {
  color: var(--text-strong);
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

.rename-filter {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-strong);
  cursor: pointer;
}

.rename-filter__panel {
  padding: var(--sp-3) var(--sp-4);
}

/* 浮动菜单：原版 $menu 的浮层外观（.dropDown-wrap background rgba(64,64,64,.95)） */
.rename-menu {
  position: fixed;
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

.rename-bottom__icon {
  display: inline-flex;
  width: var(--icon-lg);
  height: var(--icon-lg);
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.rename-bottom__icon:hover {
  color: var(--text-strong);
}

/* 原版 .verline{height:13px;border-left:2px solid #006fff;opacity:0}（:56774，原版就是不可见的） */
.rename-bottom__divider {
  width: 1px;
  height: var(--h-verline);
  border: none;
  border-left: 2px solid var(--c-accent);
  background: var(--c-verline);
  opacity: 0;
}
</style>
