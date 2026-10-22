<script setup lang="ts">
import { computed } from 'vue'
import GButton from '@/components/GButton.vue'
import Icon from '@/components/Icon.vue'

export interface GridItem {
  text?: string
  name?: string
  group?: string
  alias?: string
  icon?: string
  btnId?: number
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    items: GridItem[]
    columns: number
    showIcon?: boolean
    showText?: boolean
    removable?: boolean
  }>(),
  {
    showIcon: false,
    showText: true,
    removable: false,
  },
)

defineEmits<{
  (e: 'run', item: GridItem, event: MouseEvent): void
  (e: 'menu', event: MouseEvent, item: GridItem, index: number): void
  (e: 'remove', item: GridItem, index: number): void
  /** 拖拽起手：页面据此调 `useLongPressDrag`（T-67 起不再用 HTML5 DnD） */
  (e: 'mousedown', event: MouseEvent, item: GridItem, index: number): void
}>()

const columnCount = computed(() => Math.min(4, Math.max(1, props.columns)) as 1 | 2 | 3 | 4)

function label(item: GridItem): string {
  return item.alias || item.text || item.name || ''
}
</script>

<template>
  <div class="action-buttons">
    <GButton
      v-for="(item, index) in items"
      :key="item.btnId ?? `${label(item)}-${index}`"
      grid
      :columns="columnCount"
      :removable="removable"
      :class="['action-btn', 'action-item__run']"
      :title="label(item)"
      @click="$emit('run', item, $event)"
      @contextmenu.prevent.stop="$emit('menu', $event, item, index)"
      @mousedown="$emit('mousedown', $event, item, index)"
      @remove="$emit('remove', item, index)"
    >
      <Icon v-if="showIcon && item.icon" class="action-btn__icon" :name="item.icon" size="2xs" />
      <span v-if="showText !== false" class="action-btn__text">{{ label(item) }}</span>
    </GButton>
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  margin-top: var(--sp-exact-5);
}

.action-btn__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-btn__icon {
  flex: 0 0 auto;
}
</style>
