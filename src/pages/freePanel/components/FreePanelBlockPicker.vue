<script setup lang="ts">
import type { FreePanelBlock } from '@/domain/free-panel'

defineOptions({ name: 'FreePanelBlockPicker' })

const props = defineProps<{
  block: FreePanelBlock
  depth: number
  selected: number
}>()

const emit = defineEmits<{ (e: 'select', id: number): void }>()

function select() {
  emit('select', props.block.id)
}
</script>

<template>
  <div class="fp-pick-node" :style="{ '--pick-indent': `${depth * 12}px` }">
    <button
      class="fp-pick-node__item"
      :class="{ 'is-selected': selected === block.id }"
      type="button"
      @click="select"
    >
      <span>区域 {{ block.id }}</span>
      <span class="fp-pick-node__meta">
        {{ block.type === 'row' ? '横排' : '竖排' }} · {{ block.data.length }} 项
      </span>
    </button>

    <FreePanelBlockPicker
      v-for="child in block.children"
      :key="child.id"
      :block="child"
      :depth="depth + 1"
      :selected="selected"
      @select="emit('select', $event)"
    />
  </div>
</template>

<style scoped>
.fp-pick-node {
  padding-left: var(--pick-indent, 0);
}

.fp-pick-node__item {
  display: flex;
  width: 100%;
  height: 28px;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-2);
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.fp-pick-node__item:hover,
.fp-pick-node__item.is-selected {
  border-color: var(--accent);
  background: var(--c-surface-active);
}

.fp-pick-node__meta {
  color: var(--text-faint);
  font-size: var(--fs-xs);
}
</style>
