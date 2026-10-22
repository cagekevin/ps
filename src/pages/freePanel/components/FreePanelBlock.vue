<script setup lang="ts">
import ActionGrid from '@/components/ActionGrid.vue'
import type { FreePanelBlock, FreePanelItem } from '@/domain/free-panel'

defineOptions({ name: 'FreePanelBlock' })

// 两个 prop 都只在模板里用（block.* / removableBlock），与 GButton / PageShell 一致，
// 不绑 props 常量——绑了就是未使用变量
withDefaults(
  defineProps<{
    block: FreePanelBlock
    removableBlock?: boolean
  }>(),
  { removableBlock: false },
)
const emit = defineEmits<{
  (e: 'execute', blockId: number, item: FreePanelItem): void
  (e: 'remove', blockId: number, item: FreePanelItem): void
  (e: 'remove-block', blockId: number): void
  (e: 'toggle-block', blockId: number): void
  (e: 'edit-block', blockId: number): void
  /** 拖拽起手：页面据此调 `useLongPressDrag`（T-67 起不再用 HTML5 DnD） */
  (e: 'mousedown', event: MouseEvent, blockId: number, item: FreePanelItem, index: number): void
}>()
</script>

<template>
  <div
    class="fp-block"
    :class="block.type === 'row' ? 'fp-block--row' : 'fp-block--col'"
    :data-block-id="block.id"
    :style="{ '--fp-block-width': block.width, '--fp-block-height': block.height }"
  >
    <div v-if="removableBlock" class="fp-block__tools">
      <button
        class="fp-block__tool"
        type="button"
        :title="block.type === 'row' ? '改为纵向' : '改为横向'"
        @click.stop="emit('toggle-block', block.id)"
      >
        {{ block.type === 'row' ? '↕' : '↔' }}
      </button>
      <button
        class="fp-block__tool"
        type="button"
        title="区域尺寸"
        @click.stop="emit('edit-block', block.id)"
      >
        ⤢
      </button>
      <button
        class="fp-block__tool"
        type="button"
        title="删除区域"
        @click.stop="emit('remove-block', block.id)"
      >
        ×
      </button>
    </div>

    <FreePanelBlock
      v-for="child in block.children"
      :key="child.id"
      :block="child"
      @execute="(blockId, item) => emit('execute', blockId, item)"
      @remove="(blockId, item) => emit('remove', blockId, item)"
      @remove-block="(blockId) => emit('remove-block', blockId)"
      @toggle-block="(blockId) => emit('toggle-block', blockId)"
      @edit-block="(blockId) => emit('edit-block', blockId)"
      @mousedown="(event, blockId, item, index) => emit('mousedown', event, blockId, item, index)"
    />

    <ActionGrid
      :items="block.data"
      :columns="block.showNumber || 2"
      :show-icon="block.showIcon"
      :show-text="block.showText !== false"
      removable
      @run="(item) => emit('execute', block.id, item as FreePanelItem)"
      @remove="(item) => emit('remove', block.id, item as FreePanelItem)"
      @mousedown="
        (event, item, index) => emit('mousedown', event, block.id, item as FreePanelItem, index)
      "
    />
  </div>
</template>

<style scoped>
.fp-block {
  position: relative;
  display: flex;
  width: var(--fp-block-width, auto);
  height: var(--fp-block-height, auto);
  min-width: 0;
  min-height: 0;
  gap: var(--sp-1);
}

.fp-block__tools {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  display: none;
  gap: var(--sp-1);
}

.fp-block:hover > .fp-block__tools {
  display: flex;
}

.fp-block__tool {
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-faint);
  line-height: 16px;
  cursor: pointer;
}

.fp-block--row {
  flex-direction: row;
}

.fp-block--col {
  flex-direction: column;
}
</style>
