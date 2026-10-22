<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import { usePopover } from '@/composables/usePopover'
import type { ActionWarehouseIndex } from '@/domain/action'

/**
 * 原版 warehouse（app.v4.js:53743-54004）：
 * 仓库下拉 + 行内重命名 + hover 删除 + 创建新分组。
 */
const props = withDefaults(
  defineProps<{
    data: ActionWarehouseIndex
    isAdd?: boolean
    isMore?: boolean
  }>(),
  { isAdd: true, isMore: true },
)

const emit = defineEmits<{
  (e: 'select', index: number): void
  (e: 'add'): void
  (e: 'delete', index: number): void
  (e: 'rename', payload: { index: number; val: string }): void
}>()

const hoverIndex = ref(-1)
const editIndex = ref(-1)
const editValue = ref('')
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const { open, close, toggle, onTriggerKeydown } = usePopover({
  placement: 'bottom-start',
  matchWidth: 'width',
  triggerRef,
  panelRef,
})

watch(open, (value) => {
  if (value) return
  hoverIndex.value = -1
  editIndex.value = -1
})

function toggleOpen() {
  toggle()
  hoverIndex.value = -1
  editIndex.value = -1
}

function select(index: number) {
  emit('select', index)
  close()
}

function startRename(index: number) {
  editIndex.value = index
  editValue.value = props.data.list[index]?.name ?? ''
}

function commitRename() {
  if (editIndex.value < 0) return
  const val = editValue.value.trim()
  if (val) emit('rename', { index: editIndex.value, val })
  editIndex.value = -1
}
</script>

<template>
  <div class="action-warehouse">
    <button
      ref="triggerRef"
      class="action-warehouse__trigger"
      type="button"
      :aria-expanded="open"
      @click="toggleOpen"
      @keydown="onTriggerKeydown"
    >
      <Icon name="#iconmorencangku" size="md" />
      <span class="action-warehouse__name">{{ data.list[data.index]?.name ?? '默认仓库' }}</span>
      <Icon
        class="action-warehouse__chevron"
        :class="{ 'is-open': open }"
        name="#iconzhankaizhedie"
        size="2xs"
      />
    </button>

    <div v-if="open" ref="panelRef" class="action-warehouse__down">
      <div class="action-warehouse__list">
        <div
          v-for="(item, index) in data.list"
          :key="`${item.fileName}-${index}`"
          class="action-warehouse__item"
          @mouseenter="hoverIndex = index"
          @mouseleave="hoverIndex = -1"
          @click.stop="select(index)"
        >
          <Icon
            v-if="data.index === index"
            class="action-warehouse__check"
            name="#icongouxuan"
            size="2xs"
          />

          <input
            v-if="editIndex === index"
            v-model="editValue"
            class="action-warehouse__input"
            type="text"
            @click.stop
            @keyup.enter="commitRename"
            @blur="commitRename"
          />
          <span v-else class="action-warehouse__item-name">{{ item.name }}</span>

          <div v-if="isMore && hoverIndex === index" class="action-warehouse__actions">
            <button type="button" title="重命名" @click.stop="startRename(index)">
              <Icon name="#iconshuru" size="2xs" />
            </button>
            <button type="button" title="删除" @click.stop="emit('delete', index)">
              <Icon name="#iconshanchu" size="2xs" />
            </button>
          </div>
        </div>
      </div>

      <hr v-if="isAdd" class="action-warehouse__line" />
      <button v-if="isAdd" class="action-warehouse__add" type="button" @click="emit('add')">
        <Icon name="#iconchuangjian" size="2xs" />
        <span>创建新分组</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-warehouse {
  position: relative;
  width: 100%;
}

.action-warehouse__trigger {
  display: flex;
  width: 100%;
  height: 36px;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-exact-10);
  border: 0;
  background: var(--c-surface-active);
  color: var(--text);
  font-size: var(--fs-md);
  text-align: left;
  cursor: pointer;
}

.action-warehouse__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-warehouse__chevron {
  color: var(--text-faint);
  transition: transform var(--dur-fast) var(--ease);
}

.action-warehouse__chevron.is-open {
  transform: rotate(180deg);
}

.action-warehouse__down {
  position: fixed;
  top: var(--floating-y, 0);
  left: var(--floating-x, 0);
  z-index: var(--z-toast);
  width: var(--floating-width, auto);
  padding: var(--sp-2) 0;
  border-radius: var(--r-input);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}

.action-warehouse__list {
  max-height: 60vh;
  overflow-y: auto;
}

.action-warehouse__item {
  display: flex;
  height: 28px;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-3);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.action-warehouse__item:hover {
  background: var(--c-surface-active);
}

.action-warehouse__check {
  flex: 0 0 auto;
}

.action-warehouse__item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-warehouse__input {
  flex: 1;
  min-width: 0;
  height: 22px;
  padding: 0 var(--sp-1);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-sm);
  background: var(--c-sunken);
  color: var(--text);
  font-size: var(--fs-md);
}

.action-warehouse__actions {
  display: flex;
  gap: var(--sp-1);
}

.action-warehouse__actions button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.action-warehouse__line {
  height: 1px;
  margin: var(--sp-1) 0;
  border: 0;
  background: var(--c-border);
}

.action-warehouse__add {
  display: flex;
  width: 100%;
  height: 28px;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-3);
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.action-warehouse__add:hover {
  background: var(--c-surface-active);
}
</style>
