<script setup lang="ts">
import { ref, watch } from 'vue'
import CepModal from '@/components/CepModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import { findBlock, type FreePanelBlock } from '@/domain/free-panel'
import FreePanelBlockPicker from './FreePanelBlockPicker.vue'

const props = withDefaults(
  defineProps<{
    blocks: FreePanelBlock[]
    title?: string
  }>(),
  { title: '请选择区域' },
)

const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ (e: 'confirm', blockId: number): void }>()

const selected = ref(0)

function ensureSelected() {
  if (selected.value && findBlock(props.blocks, selected.value)) return
  selected.value = props.blocks[0]?.id ?? 0
}

watch(
  [visible, () => props.blocks],
  ([open]) => {
    if (open) ensureSelected()
  },
  { immediate: true },
)

function confirm() {
  if (!selected.value) return
  emit('confirm', selected.value)
}
</script>

<template>
  <CepModal v-model:visible="visible" :title="title" ok-text="确定" :width="280" @ok="confirm">
    <p class="fp-region__hint">选择要放入的区域</p>
    <div class="fp-region__list">
      <FreePanelBlockPicker
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        :depth="0"
        :selected="selected"
        @select="selected = $event"
      />
    </div>
    <EmptyState
      v-if="!blocks.length"
      compact
      class="fp-region__empty"
      text="自由面板没有可用区域"
    />
  </CepModal>
</template>

<style scoped>
.fp-region__hint {
  margin: 0 0 var(--sp-2);
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

.fp-region__list {
  max-height: 50vh;
  overflow-y: auto;
}

.fp-region__empty {
  margin: 0;
  padding: var(--sp-3) 0;
  color: var(--text-faint);
  font-size: var(--fs-sm);
}
</style>
