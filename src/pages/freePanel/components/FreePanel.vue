<script setup lang="ts">
import { msg } from '@/domain/messages'
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import Icon from '@/components/Icon.vue'
import CepModal from '@/components/CepModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useCommand } from '@/components/command/useCommand'
import { useDismiss } from '@/composables/useDismiss'
import { useLongPressDrag, type LongPressDragResult } from '@/composables/useLongPressDrag'
import { useFreePanelStore } from '@/stores/free-panel'
import {
  findBlock,
  walkBlocks,
  type FreePanelBlock as Block,
  type FreePanelItem,
} from '@/domain/free-panel'
import FreePanelBlock from './FreePanelBlock.vue'

/**
 * 自由面板展示层。
 *
 * 真实数据是嵌套 block 树，不是扁平 list。
 * 只消费 freePanel store；执行/删除走命令。
 */
const store = useFreePanelStore()
const { blocks, degraded } = storeToRefs(store)

/**
 * 空态文案。读坏（`degraded`）时**不能**还显示"还没有自由面板区域"——
 * 那等于把"文件坏了"说成"面板是空的"。原文件仍在磁盘上（写路径 D-42 会拒绝覆盖）。
 */
const emptyText = computed(() =>
  degraded.value ? `${degraded.value}，自由面板数据未载入（原文件已保留）` : '还没有自由面板区域。',
)

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

/**
 * 菜单左缘 clamp（TD-05-5）。
 *
 * 菜单是 `position:absolute; right:var(--sp-1); min-width:132px`：窄面板（宽 < 134）时左缘变负，
 * 被父容器 `overflow` 裁掉一块 —— 用户**点不到**最左边那列勾选。
 * 只在"装不下"时改成贴左（`left:0; right:auto`），宽面板位置一个像素都不动（反向对照见用例）。
 */
const MENU_MIN_WIDTH = 132
const menuClamped = ref(false)

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) refreshMenuClamp()
}

function refreshMenuClamp(): void {
  const width = root.value?.getBoundingClientRect().width ?? 0
  // 可用宽 = 容器宽 - 右侧 gap（--sp-1 = 4px）；装不下就贴左
  menuClamped.value = width > 0 && width - 4 < MENU_MIN_WIDTH
}

// ---------- 显示设置的勾选态（D-32：口径是全局，勾选态必须如实反映"是否所有区域一致"）----------
//
// 命令一次写所有 block（有意简化，见 `commands/freePanel.ts` 的 `freePanel.setDisplay` 注释），
// 但原版数据是**按区域存**的。所以不能拿 `blocks[0]` 的值冒充全局值——那样"各区域不一致"
// 会显示成"已选"，用户点一下就以为只是保持原状。
//
// 列数是 2/3/4 三选一，"半选"没有唯一可落的行，不一致时三条都不打勾；
// 图标 / 文字是单行布尔，不一致时显示「–」（半选）。

/** 所有区域（含嵌套 children），与 `setDisplay` 写入的范围一致 */
const allBlocks = computed(() => {
  const out: Block[] = []
  walkBlocks(blocks.value, (block) => {
    out.push(block)
  })
  return out
})

/** 单行布尔的三态标记：全开 '✓' / 不一致 '–' / 全关 '' */
function flagMark(values: boolean[]): string {
  if (!values.length) return ''
  if (values.every(Boolean)) return '✓'
  if (values.every((value) => !value)) return ''
  return '–'
}

const iconMark = computed(() => flagMark(allBlocks.value.map((block) => block.showIcon === true)))
const textMark = computed(() => flagMark(allBlocks.value.map((block) => block.showText !== false)))

/** 所有区域列数一致时才有勾选；不一致（或没有区域）时三条都不打勾 */
const uniformColumns = computed(() => {
  const numbers = allBlocks.value.map((block) => block.showNumber)
  if (!numbers.length || numbers.some((value) => value !== numbers[0])) return 0
  return numbers[0]
})

function columnMark(columns: number): string {
  return uniformColumns.value === columns ? '✓' : ''
}

useDismiss(
  () => menuOpen.value,
  root,
  () => (menuOpen.value = false),
)

function setColumns(columns: 2 | 3 | 4) {
  menuOpen.value = false
  void displayCmd.invoke({ showNumber: columns })
}

/** 不一致时点一下 = 统一开启（再点一次才全部关闭）；不能拿第一个区域的值取反 */
function toggleIcon() {
  menuOpen.value = false
  void displayCmd.invoke({ showIcon: iconMark.value !== '✓' })
}

function toggleText() {
  menuOpen.value = false
  void displayCmd.invoke({ showText: textMark.value !== '✓' })
}

function clearWorkspace() {
  menuOpen.value = false
  void clearCmd.invoke({}, msg.success.text.workspaceDeleted)
}

function addBlock() {
  menuOpen.value = false
  void addBlockCmd.invoke({ type: 'norow' }, msg.success.text.regionAdded)
}

function removeBlock(blockId: number) {
  void removeBlockCmd.invoke({ blockId }, msg.success.text.regionDeleted)
}

function toggleBlock(blockId: number) {
  const block = findBlock(blocks.value, blockId)
  if (!block) return
  void setBlockCmd.invoke({
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
  await setBlockCmd.invoke({
    blockId,
    width: width.trim(),
    height: height.trim(),
  })
  blockEdit.value.visible = false
}

function invoke(blockId: number, item: FreePanelItem) {
  void executeCmd.invoke({ blockId, btnId: item.btnId }, msg.success.fn.itemExecuted(item.text))
}

function remove(blockId: number, item: FreePanelItem) {
  void removeCmd.invoke({ blockId, btnId: item.btnId }, msg.success.fn.itemRemoved(item.text))
}

// ---------- 拖拽排序（`am()` 机制，见 `composables/useLongPressDrag`）----------
//
// 照 `/style` 范本接线。落点候选是**所有 block 里的所有项**，所以可以跨 block 移动；
// 旧的 HTML5 DnD（`dragstart/dragover/drop`）已删，T-67。

interface DragSlot {
  blockId: number
  btnId: number
}

interface SlotTarget {
  element: HTMLElement
  slot: DragSlot
}

const drag = useLongPressDrag()
let dragSource: DragSlot | null = null
let dragTarget: DragSlot | null = null

/**
 * 项落点：每个 block 只取**自己直属**的 `.action-buttons`（嵌套 block 的按钮不算父块的）。
 * 下标就是 `block.data` 的下标，与 `ActionGrid` 的渲染顺序一致。
 */
function itemTargets(): SlotTarget[] {
  const rootElement = root.value
  if (!rootElement) return []
  const out: SlotTarget[] = []
  for (const blockElement of rootElement.querySelectorAll<HTMLElement>('[data-block-id]')) {
    const blockId = Number(blockElement.dataset.blockId)
    if (!Number.isInteger(blockId)) continue
    const block = findBlock(blocks.value, blockId)
    if (!block) continue
    const grid = Array.from(blockElement.children).find((child) =>
      child.classList.contains('action-buttons'),
    )
    if (!grid) continue
    grid.querySelectorAll<HTMLElement>('.action-item__run').forEach((element, index) => {
      const item = block.data[index]
      if (item) out.push({ element, slot: { blockId, btnId: item.btnId } })
    })
  }
  return out
}

function onItemMouseDown(event: MouseEvent, blockId: number, item: FreePanelItem) {
  dragSource = { blockId, btnId: item.btnId }
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

async function endItemDrag(result: LongPressDragResult) {
  const source = dragSource
  const target = dragTarget
  dragSource = null
  dragTarget = null
  if (!source || !target || !result.dragged) return
  if (source.blockId === target.blockId && source.btnId === target.btnId) return

  await reorderCmd.invoke({
    fromBlockId: source.blockId,
    fromBtnId: source.btnId,
    toBlockId: target.blockId,
    toBtnId: target.btnId,
    position: result.position,
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
        @click.stop="toggleMenu"
      >
        <Icon name="#iconliebiao" size="2xs" />
      </button>

      <ul
        v-if="menuOpen"
        class="free-panel__menu"
        :class="{ 'free-panel__menu--clamped': menuClamped }"
      >
        <li>
          <button type="button" @click="setColumns(2)">
            <span class="free-panel__check">{{ columnMark(2) }}</span
            >双列
          </button>
        </li>
        <li>
          <button type="button" @click="setColumns(3)">
            <span class="free-panel__check">{{ columnMark(3) }}</span
            >三列
          </button>
        </li>
        <li>
          <button type="button" @click="setColumns(4)">
            <span class="free-panel__check">{{ columnMark(4) }}</span
            >四列
          </button>
        </li>
        <li class="free-panel__menu-sep" />
        <li>
          <button type="button" @click="toggleIcon">
            <span class="free-panel__check">{{ iconMark }}</span
            >显示图标
          </button>
        </li>
        <li>
          <button type="button" @click="toggleText">
            <span class="free-panel__check">{{ textMark }}</span
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

    <EmptyState v-if="!blocks.length" compact class="free-panel__empty" :text="emptyText" />

    <div v-else class="free-panel__tree">
      <FreePanelBlock
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        :removable-block="blocks.length > 1"
        @execute="invoke"
        @remove="remove"
        @remove-block="removeBlock"
        @toggle-block="toggleBlock"
        @edit-block="editBlock"
        @mousedown="onItemMouseDown"
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

.free-panel__menu--clamped {
  right: auto;
  left: 0;
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
