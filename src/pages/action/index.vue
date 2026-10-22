<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import CepModal from '@/components/CepModal.vue'
import GInput from '@/components/GInput.vue'
import BaseGroup from '@/components/BaseGroup.vue'
import Icon from '@/components/Icon.vue'
import { useCommand } from '@/components/command/useCommand'
import { useDismiss } from '@/composables/useDismiss'
import { useFloatingPosition } from '@/composables/useFloatingPosition'
import { usePersistedRef } from '@/composables/usePersisted'
import { useActionStore } from '@/stores/action'
import { useFeedbackStore } from '@/stores/feedback'
import type { ActionItem } from '@/domain/action'
import type { FreePanelItemInput } from '@/commands/payloads'
import { useFreePanelAdd } from '@/composables/useFreePanelAdd'
import ActionWarehouse from './components/ActionWarehouse.vue'
import ActionAddContext from './components/ActionAddContext.vue'
import ActionGrid, { type GridItem } from '@/components/ActionGrid.vue'
import EmptyState from '@/components/EmptyState.vue'
import GDropdown from '@/components/GDropdown.vue'
import PageBottomBar from '@/components/PageBottomBar.vue'
import FreePanelRegionPicker from '@/pages/freePanel/components/FreePanelRegionPicker.vue'

const store = useActionStore()
const {
  visible: freePanelVisible,
  title: freePanelTitle,
  blocks: freePanelBlocks,
  open: openFreePanelPicker,
  confirm: confirmFreePanel,
} = useFreePanelAdd()
const feedback = useFeedbackStore()
const { warehouses, activeIndex, groups, listType, degraded } = storeToRefs(store)
const { psGroups, psLoading, psUnparsed, psError } = storeToRefs(store)

const callCmd = useCommand('action.call')
const addGroupCmd = useCommand('action.addGroup')
const renameGroupCmd = useCommand('action.renameGroup')
const deleteGroupCmd = useCommand('action.deleteGroup')
const deleteItemCmd = useCommand('action.deleteItem')
const setAliasCmd = useCommand('action.setAlias')
const deleteAliasCmd = useCommand('action.deleteAlias')
const addFromPsCmd = useCommand('action.addFromPs')
const selectWarehouseCmd = useCommand('action.selectWarehouse')
const addWarehouseCmd = useCommand('action.addWarehouse')
const renameWarehouseCmd = useCommand('action.renameWarehouse')
const deleteWarehouseCmd = useCommand('action.deleteWarehouse')
const toggleGroupCmd = useCommand('action.toggleGroup')
const setListTypeCmd = useCommand('action.setListType')
const reorderGroupCmd = useCommand('action.reorderGroup')
const reorderItemCmd = useCommand('action.reorderItem')
const exportWarehouseCmd = useCommand('action.exportWarehouse')
const importWarehouseCmd = useCommand('action.importWarehouse')
const importDefaultCmd = useCommand('action.importDefault')

/** 默认动作预设只提示一次；导入成功后不再打扰 */
const guideDone = usePersistedRef('action.guideDone', false)
const firstUseVisible = ref(false)

async function importDefaultActions() {
  const ok = await importDefaultCmd.run(undefined, '已导入默认动作预设')
  if (ok) guideDone.value = true
}

const warehouseData = computed(() => ({ index: activeIndex.value, list: warehouses.value }))

function toggleGroup(index: number) {
  void toggleGroupCmd.run({ index })
}

// ---------- 拖拽排序 ----------
type DragState =
  { kind: 'group'; groupIndex: number } | { kind: 'item'; groupIndex: number; itemIndex: number }

const dragState = ref<DragState | null>(null)
const dropTarget = ref<{
  groupIndex: number
  itemIndex: number
  position: 'before' | 'after'
} | null>(null)

function clearDrag() {
  dragState.value = null
  dropTarget.value = null
}

function onGroupDragStart(event: DragEvent, groupIndex: number) {
  dragState.value = { kind: 'group', groupIndex }
  event.dataTransfer?.setData('text/plain', 'action-group')
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onItemDragStart(event: DragEvent, groupIndex: number, itemIndex: number) {
  event.stopPropagation()
  dragState.value = { kind: 'item', groupIndex, itemIndex }
  event.dataTransfer?.setData('text/plain', 'action-item')
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onItemDragOver(event: DragEvent, groupIndex: number, itemIndex: number) {
  if (!dragState.value) return
  event.preventDefault()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const position = event.clientX > rect.left + rect.width / 2 ? 'after' : 'before'
  dropTarget.value = { groupIndex, itemIndex, position }
}

async function onItemDrop(event: DragEvent, groupIndex: number, itemIndex: number) {
  event.preventDefault()
  event.stopPropagation()
  const drag = dragState.value
  const target = dropTarget.value
  clearDrag()
  if (!drag || !target) return

  if (drag.kind === 'group') {
    await reorderGroupCmd.run({ from: drag.groupIndex, to: groupIndex })
    return
  }

  await reorderItemCmd.run({
    fromGroup: drag.groupIndex,
    fromIndex: drag.itemIndex,
    toGroup: groupIndex,
    toIndex: itemIndex,
    position: target.position,
  })
}

async function onGroupDrop(event: DragEvent, groupIndex: number) {
  event.preventDefault()
  const drag = dragState.value
  clearDrag()
  if (!drag) return

  if (drag.kind === 'group') {
    await reorderGroupCmd.run({ from: drag.groupIndex, to: groupIndex })
    return
  }

  // 拖到分组空白处：追加到该组末尾
  const target = groups.value[groupIndex]
  if (!target) return
  await reorderItemCmd.run({
    fromGroup: drag.groupIndex,
    fromIndex: drag.itemIndex,
    toGroup: groupIndex,
    toIndex: target.list.length,
    position: 'before',
  })
}

function dropClass(groupIndex: number, itemIndex: number): string {
  const target = dropTarget.value
  if (!target || target.groupIndex !== groupIndex || target.itemIndex !== itemIndex) return ''
  return target.position === 'after' ? 'is-drop-after' : 'is-drop-before'
}

// ---------- 右键菜单 ----------
type MenuKind = 'group' | 'item'
const menu = ref({
  visible: false,
  x: 0,
  y: 0,
  kind: 'group' as MenuKind,
  groupIndex: 0,
  itemIndex: -1,
})
const menuRef = ref<HTMLElement | null>(null)
const menuPoint = computed(() => ({ x: menu.value.x, y: menu.value.y }))
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
  () => [menu.value.visible, menu.value.x, menu.value.y],
  async ([visible]) => {
    if (!visible) return
    await nextTick()
    updateMenuPosition()
  },
)

function openMenu(event: MouseEvent, kind: MenuKind, groupIndex: number, itemIndex = -1) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  menu.value = { visible: true, x: rect.left, y: rect.bottom + 2, kind, groupIndex, itemIndex }
}

// ---------- 分组弹层 ----------
const groupModal = ref({
  visible: false,
  mode: 'create' as 'create' | 'rename',
  index: -1,
  afterIndex: undefined as number | undefined,
  title: '新建分组',
  value: '',
})

function openGroupCreate(afterIndex?: number) {
  menu.value.visible = false
  groupModal.value = {
    visible: true,
    mode: 'create',
    index: -1,
    afterIndex,
    title: '新建分组',
    value: '',
  }
}

function openGroupRename() {
  const index = menu.value.groupIndex
  menu.value.visible = false
  groupModal.value = {
    visible: true,
    mode: 'rename',
    index,
    afterIndex: undefined,
    title: '重命名分组',
    value: groups.value[index]?.groupName ?? '',
  }
}

async function submitGroup() {
  const { mode, index, afterIndex, value } = groupModal.value
  if (mode === 'create') await addGroupCmd.run({ name: value, afterIndex })
  else await renameGroupCmd.run({ index, name: value })
}

// ---------- 仓库 ----------
async function onWarehouseAdd() {
  await addWarehouseCmd.run({})
  await store.load()
}

async function onWarehouseRename(payload: { index: number; val: string }) {
  await renameWarehouseCmd.run({ index: payload.index, name: payload.val })
  await store.load()
}

function onWarehouseDelete(index: number) {
  const name = warehouses.value[index]?.name ?? ''
  askConfirm(`删除仓库「${name}」？仓库文件也会删除。`, async () => {
    await deleteWarehouseCmd.run({ index })
    await store.load()
  })
}

async function onWarehouseSelect(index: number) {
  if (index === activeIndex.value) return
  const ok = await selectWarehouseCmd.run({ index })
  if (ok) await store.load()
}

// ---------- 别名弹层 ----------
const aliasModal = ref({ visible: false, groupIndex: 0, itemIndex: 0, value: '' })

function openAlias() {
  const { groupIndex, itemIndex } = menu.value
  const item = groups.value[groupIndex]?.list[itemIndex]
  menu.value.visible = false
  if (!item) return
  aliasModal.value = { visible: true, groupIndex, itemIndex, value: item.alias ?? '' }
}

async function submitAlias() {
  const { groupIndex, itemIndex, value } = aliasModal.value
  if (!value.trim()) {
    await deleteAliasCmd.run({ groupIndex, itemIndex }, '已删除别名')
    return
  }
  await setAliasCmd.run({ groupIndex, itemIndex, alias: value }, `别名已设为「${value}」`)
}

// ---------- 确认弹层 ----------
const confirmState = ref({ visible: false, text: '', run: async () => {} })

function askConfirm(text: string, run: () => Promise<void>) {
  confirmState.value = { visible: true, text, run }
}

async function onConfirm() {
  await confirmState.value.run()
}

function requestDeleteGroup() {
  const index = menu.value.groupIndex
  const name = groups.value[index]?.groupName ?? ''
  menu.value.visible = false
  askConfirm(`删除分组「${name}」？组内动作只从列表移除，不影响 Photoshop。`, async () => {
    await deleteGroupCmd.run({ index }, `已删除分组「${name}」`)
  })
}

function requestDeleteItem() {
  const { groupIndex, itemIndex } = menu.value
  const item = groups.value[groupIndex]?.list[itemIndex]
  menu.value.visible = false
  if (!item) return
  askConfirm(`删除动作「${item.alias || item.name}」？`, async () => {
    await deleteItemCmd.run({ groupIndex, itemIndex }, '已删除动作')
  })
}

// ---------- 添加动作 ----------
const addContext = ref({ visible: false, groupIndex: 0 })

function openAddContext(groupIndex: number) {
  addContext.value = { visible: true, groupIndex }
  void store.loadPsActions()
}

async function confirmAdd(items: Array<{ group: string; name: string }>) {
  if (!items.length) {
    addContext.value.visible = false
    return
  }
  await addFromPsCmd.run(
    { groupIndex: addContext.value.groupIndex, items },
    `已添加 ${items.length} 个动作`,
  )
  addContext.value.visible = false
}

// ---------- 列布局 ----------
const layoutMenu = ref(false)
/** 底栏已提成公共组件（样式页也用）；菜单挂在底栏上，所以要拿它的根元素 */
const bottomBar = ref<InstanceType<typeof PageBottomBar> | null>(null)
const layoutRef = computed(() => bottomBar.value?.root ?? null)
useDismiss(
  () => layoutMenu.value,
  layoutRef,
  () => {
    layoutMenu.value = false
  },
)

async function chooseLayout(columns: 1 | 2 | 3) {
  layoutMenu.value = false
  const ok = await setListTypeCmd.run({ columns })
  if (ok) listType.value = columns
}

const importMenu = ref(false)
const exportMenu = ref(false)

async function exportWarehouse(current: boolean) {
  exportMenu.value = false
  const ok = await exportWarehouseCmd.run({ current }, '导出成功')
  if (ok) await store.load()
}

async function importWarehouse(append: boolean) {
  importMenu.value = false
  const ok = await importWarehouseCmd.run({ append }, '导入成功')
  if (ok) await store.load()
}

function requestImportReplace() {
  importMenu.value = false
  askConfirm('导入替换会覆盖当前仓库索引，确定继续？', async () => {
    await importWarehouse(false)
  })
}

// ---------- 自由面板 ----------
function freePanelItem(item: ActionItem): FreePanelItemInput {
  return {
    text: item.alias || item.name,
    // 原版自由面板协议使用 dz_useAction；执行时由 freePanel.execute 映射到 action.call
    key: 'dz_useAction',
    option: { group: item.group, name: item.name, alias: item.alias },
  }
}

function openFreePanel(item: ActionItem) {
  openFreePanelPicker([freePanelItem(item)])
}

function openGroupFreePanel(groupIndex: number) {
  const group = groups.value[groupIndex]
  if (!group?.list.length) {
    feedback.info('该分组没有动作')
    return
  }
  openFreePanelPicker(group.list.map(freePanelItem), '批量添加动作组')
}

// ---------- 其他 ----------
function runAction(item: GridItem, event?: MouseEvent) {
  const action = item as ActionItem
  // 原版 showMenu：Ctrl+点击动作 → $freePanelBox.show(name, "dz_useAction", item)
  if (event?.ctrlKey) {
    openFreePanel(action)
    return
  }

  void callCmd.run(
    { group: action.group, name: action.name, alias: action.alias },
    `已执行「${action.alias || action.name}」`,
  )
}

onMounted(async () => {
  await store.load()
  // 只有动作库为空时才提示；已有动作的用户不打扰
  if (!guideDone.value && groups.value.length === 0) firstUseVisible.value = true
})
</script>

<template>
  <div class="action-page">
    <ActionWarehouse
      :data="warehouseData"
      @select="onWarehouseSelect"
      @add="onWarehouseAdd"
      @delete="onWarehouseDelete"
      @rename="onWarehouseRename"
    />

    <p v-if="degraded" class="action-warning">{{ degraded }}，动作库可能不完整</p>

    <div class="action-groups">
      <EmptyState
        v-if="!groups.length"
        compact
        class="action-empty"
        text="还没有动作，先新建分组，再从 Photoshop 添加。"
      />

      <section
        v-for="(group, groupIndex) in groups"
        :key="`${group.groupName}-${groupIndex}`"
        class="action-group"
        draggable="true"
        @dragstart="onGroupDragStart($event, groupIndex)"
        @dragover.prevent
        @drop="onGroupDrop($event, groupIndex)"
        @dragend="clearDrag"
      >
        <BaseGroup
          :text="group.groupName"
          :value="group.show"
          @change="toggleGroup(groupIndex)"
          @ctrl="openGroupFreePanel(groupIndex)"
          @menu="openMenu($event, 'group', groupIndex)"
        >
          <template #header>
            <button
              class="action-group__add"
              type="button"
              title="添加动作"
              @click.stop="openAddContext(groupIndex)"
            >
              <Icon name="#iconchuangjian" size="2xs" />
            </button>
          </template>

          <ActionGrid
            :items="group.list"
            :columns="listType"
            :draggable="true"
            :item-class="(_item, index) => dropClass(groupIndex, index)"
            @run="runAction"
            @menu="(event, _item, index) => openMenu(event, 'item', groupIndex, index)"
            @dragstart="(event, _item, index) => onItemDragStart(event, groupIndex, index)"
            @dragover="(event, _item, index) => onItemDragOver(event, groupIndex, index)"
            @drop="(event, _item, index) => onItemDrop(event, groupIndex, index)"
            @dragend="clearDrag"
          />
          <EmptyState
            v-if="!group.list.length"
            compact
            class="action-empty action-empty--inline"
            text="该动作组空空如也"
          />
        </BaseGroup>
      </section>
    </div>

    <PageBottomBar ref="bottomBar">
      <button class="g-bottom-bar__icon" type="button" title="添加分组" @click="openGroupCreate()">
        <Icon name="#iconxinjiandongzuofenzu" />
      </button>
      <button
        class="g-bottom-bar__icon"
        type="button"
        title="显示方式"
        @click="layoutMenu = !layoutMenu"
      >
        <Icon name="#iconliebiao" />
      </button>
      <span class="g-bottom-bar__divider" />
      <GDropdown v-model:visible="importMenu" placement="top-start">
        <template #trigger>
          <button class="g-bottom-bar__icon" type="button" title="导入预设">
            <Icon name="#icondaoru" />
          </button>
        </template>
        <ul class="action-io-menu">
          <li><button type="button" @click="importWarehouse(true)">导入追加</button></li>
          <li><button type="button" @click="requestImportReplace">导入替换…</button></li>
        </ul>
      </GDropdown>

      <GDropdown v-model:visible="exportMenu" placement="top-start">
        <template #trigger>
          <button class="g-bottom-bar__icon" type="button" title="导出预设">
            <Icon name="#icondaochu" />
          </button>
        </template>
        <ul class="action-io-menu">
          <li><button type="button" @click="exportWarehouse(false)">导出全部</button></li>
          <li><button type="button" @click="exportWarehouse(true)">导出当前</button></li>
        </ul>
      </GDropdown>

      <ul v-if="layoutMenu" class="ctx-menu action-layout-menu">
        <li><button type="button" @click="chooseLayout(1)">单列</button></li>
        <li><button type="button" @click="chooseLayout(2)">双列</button></li>
        <li><button type="button" @click="chooseLayout(3)">三列</button></li>
      </ul>
    </PageBottomBar>

    <ul v-if="menu.visible" ref="menuRef" class="ctx-menu" :style="menuStyle">
      <template v-if="menu.kind === 'group'">
        <li><button type="button" @click="openGroupCreate(menu.groupIndex)">创建新组</button></li>
        <li><button type="button" @click="openGroupRename">重命名</button></li>
        <li><button type="button" @click="requestDeleteGroup">删除</button></li>
      </template>
      <template v-else>
        <li><button type="button" @click="openAlias">设置别名</button></li>
        <li><button type="button" @click="requestDeleteItem">删除动作</button></li>
      </template>
    </ul>

    <CepModal v-model:visible="groupModal.visible" :title="groupModal.title" @ok="submitGroup">
      <GInput v-model="groupModal.value" placeholder="分组名" @enter="submitGroup" />
    </CepModal>

    <CepModal v-model:visible="aliasModal.visible" title="动作别名" @ok="submitAlias">
      <GInput v-model="aliasModal.value" placeholder="留空则删除别名" @enter="submitAlias" />
    </CepModal>

    <ActionAddContext
      v-model:visible="addContext.visible"
      :groups="psGroups"
      :loading="psLoading"
      :error="psError"
      :unparsed="psUnparsed"
      @confirm="confirmAdd"
    />

    <FreePanelRegionPicker
      v-model:visible="freePanelVisible"
      :blocks="freePanelBlocks"
      :title="freePanelTitle"
      @confirm="confirmFreePanel"
    />

    <CepModal v-model:visible="confirmState.visible" title="确认" @ok="onConfirm">
      <p class="action-hint">{{ confirmState.text }}</p>
    </CepModal>

    <CepModal
      v-model:visible="firstUseVisible"
      title="动作库"
      ok-text="导入默认动作"
      cancel-text="稍后"
      @ok="importDefaultActions"
    >
      <p class="action-hint">动作库还是空的，是否导入默认动作预设？</p>
    </CepModal>
  </div>
</template>

<style scoped src="./index.css"></style>
