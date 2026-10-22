<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import Icon from '@/components/Icon.vue'
import CepModal from '@/components/CepModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useCommand } from '@/components/command/useCommand'
import { useDismiss } from '@/composables/useDismiss'
import { useFreePanelStore } from '@/stores/free-panel'
import { findBlock, type FreePanelItem } from '@/domain/free-panel'
import FreePanelBlock from './FreePanelBlock.vue'

/**
 * 自由面板展示层。
 *
 * 真实数据是嵌套 block 树，不是扁平 list。
 * 只消费 freePanel store；执行/删除走命令。
 */
const store = useFreePanelStore()
const { blocks } = storeToRefs(store)

const executeCmd = useCommand('freePanel.execute')
const removeCmd = useCommand('freePanel.remove')
const reorderCmd = useCommand('freePanel.reorder')
const displayCmd = useCommand('freePanel.setDisplay')
const clearCmd = useCommand('freePanel.clear')
const addBlockCmd = useCommand('freePanel.addBlock')
const removeBlockCmd = useCommand('freePanel.removeBlock')
const setBlockCmd = useCommand('freePanel.setBlock')

const blockEdit = ref({
  visible: false,
  blockId: 0,
  width: '',
  height: '',
})

const root = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const showNumber = computed(() => blocks.value[0]?.showNumber ?? 2)
const showIcon = computed(() => blocks.value[0]?.showIcon === true)
const showText = computed(() => blocks.value[0]?.showText !== false)

useDismiss(
  () => menuOpen.value,
  root,
  () => (menuOpen.value = false),
)

function setColumns(columns: 2 | 3 | 4) {
  menuOpen.value = false
  void displayCmd.run({ showNumber: columns })
}

function toggleIcon() {
  menuOpen.value = false
  void displayCmd.run({ showIcon: !showIcon.value })
}

function toggleText() {
  menuOpen.value = false
  void displayCmd.run({ showText: !showText.value })
}

function clearWorkspace() {
  menuOpen.value = false
  void clearCmd.run({}, '已删除工作区')
}

function addBlock() {
  menuOpen.value = false
  void addBlockCmd.run({ type: 'norow' }, '已新增区域')
}

function removeBlock(blockId: number) {
  void removeBlockCmd.run({ blockId }, '已删除区域')
}

function toggleBlock(blockId: number) {
  const block = findBlock(blocks.value, blockId)
  if (!block) return
  void setBlockCmd.run({
    blockId,
    type: block.type === 'row' ? 'norow' : 'row',
  })
}

function editBlock(blockId: number) {
  const block = findBlock(blocks.value, blockId)
  if (!block) return
  blockEdit.value = {
    visible: true,
    blockId,
    width: block.width ?? '',
    height: block.height ?? '',
  }
}

async function applyBlockSize() {
  const { blockId, width, height } = blockEdit.value
  await setBlockCmd.run({
    blockId,
    width: width.trim(),
    height: height.trim(),
  })
  blockEdit.value.visible = false
}

function run(blockId: number, item: FreePanelItem) {
  void executeCmd.run({ blockId, btnId: item.btnId }, `已执行「${item.text}」`)
}

function remove(blockId: number, item: FreePanelItem) {
  void removeCmd.run({ blockId, btnId: item.btnId }, `已移除「${item.text}」`)
}

const drag = ref<{ blockId: number; btnId: number } | null>(null)

function onDragStart(event: DragEvent, blockId: number, item: FreePanelItem) {
  drag.value = { blockId, btnId: item.btnId }
  event.dataTransfer?.setData('text/plain', 'free-panel-item')
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event: DragEvent) {
  if (!drag.value) return
  event.preventDefault()
}

async function onDrop(event: DragEvent, blockId: number, item: FreePanelItem) {
  event.preventDefault()
  const source = drag.value
  drag.value = null
  if (!source || source.btnId === item.btnId) return

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const position = event.clientX > rect.left + rect.width / 2 ? 'after' : 'before'
  await reorderCmd.run({
    fromBlockId: source.blockId,
    fromBtnId: source.btnId,
    toBlockId: blockId,
    toBtnId: item.btnId,
    position,
  })
}

onMounted(() => {
  void store.load()
})
</script>

<template>
  <section ref="root" class="free-panel">
    <header class="free-panel__head">
      <button
        class="free-panel__menu-btn"
        type="button"
        title="工作区菜单"
        @click.stop="menuOpen = !menuOpen"
      >
        <Icon name="#iconliebiao" size="2xs" />
      </button>

      <ul v-if="menuOpen" class="free-panel__menu">
        <li>
          <button type="button" @click="setColumns(2)">
            <span class="free-panel__check">{{ showNumber === 2 ? '✓' : '' }}</span
            >双列
          </button>
        </li>
        <li>
          <button type="button" @click="setColumns(3)">
            <span class="free-panel__check">{{ showNumber === 3 ? '✓' : '' }}</span
            >三列
          </button>
        </li>
        <li>
          <button type="button" @click="setColumns(4)">
            <span class="free-panel__check">{{ showNumber === 4 ? '✓' : '' }}</span
            >四列
          </button>
        </li>
        <li class="free-panel__menu-sep" />
        <li>
          <button type="button" @click="toggleIcon">
            <span class="free-panel__check">{{ showIcon ? '✓' : '' }}</span
            >显示图标
          </button>
        </li>
        <li>
          <button type="button" @click="toggleText">
            <span class="free-panel__check">{{ showText ? '✓' : '' }}</span
            >显示文字
          </button>
        </li>
        <li class="free-panel__menu-sep" />
        <li>
          <button type="button" @click="addBlock">新增区域</button>
        </li>
        <li>
          <button type="button" @click="clearWorkspace">删除工作区</button>
        </li>
      </ul>
    </header>

    <EmptyState
      v-if="!blocks.length"
      compact
      class="free-panel__empty"
      text="还没有自由面板区域。"
    />

    <div v-else class="free-panel__tree">
      <FreePanelBlock
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        :removable-block="blocks.length > 1"
        @execute="run"
        @remove="remove"
        @remove-block="removeBlock"
        @toggle-block="toggleBlock"
        @edit-block="editBlock"
        @dragstart="onDragStart"
        @dragover="onDragOver"
        @drop="onDrop"
        @dragend="drag = null"
      />
    </div>

    <CepModal v-model:visible="blockEdit.visible" title="区域尺寸" @ok="applyBlockSize">
      <label class="free-panel__size">
        宽度
        <input v-model="blockEdit.width" placeholder="如 100% / 160px" />
      </label>
      <label class="free-panel__size">
        高度
        <input v-model="blockEdit.height" placeholder="如 100% / 80px" />
      </label>
    </CepModal>
  </section>
</template>

<style scoped>
.free-panel {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: var(--c-sunken);
}

.free-panel__head {
  position: relative;
  display: flex;
  height: 24px;
  flex: 0 0 24px;
  align-items: center;
  justify-content: flex-end;
  padding: 0 var(--sp-exact-10);
  color: var(--text);
  font-size: var(--fs-md);
}

.free-panel__menu-btn {
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.free-panel__menu {
  position: absolute;
  top: 24px;
  right: var(--sp-1);
  z-index: var(--z-dropdown);
  min-width: 132px;
  margin: 0;
  padding: var(--sp-1) 0;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-sm);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
  list-style: none;
}

.free-panel__menu button {
  display: flex;
  width: 100%;
  height: 28px;
  align-items: center;
  padding: 0 var(--sp-3);
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: var(--fs-md);
  text-align: left;
  cursor: pointer;
}

.free-panel__menu button:hover {
  background: var(--c-surface-active);
}

.free-panel__check {
  width: 16px;
  flex: 0 0 16px;
}

.free-panel__menu-sep {
  height: 1px;
  margin: var(--sp-1) 0;
  background: var(--c-border);
}

.free-panel__tree {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-1);
  overflow: auto;
}

.free-panel__empty {
  margin: 0;
  padding: var(--sp-4) var(--sp-exact-10);
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

.free-panel__size {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-2);
  color: var(--text);
  font-size: var(--fs-sm);
}

.free-panel__size input {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 var(--sp-2);
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  background: var(--c-surface);
  color: var(--text);
}
</style>
