<script setup lang="ts">
import type { Category, CategoryTag, FilterState } from '@/cep/classification'

/**
 * 筛选面板。对应原版 font-manage-filter-panel：
 * 按 categories 顺序渲染 评分 / 字体语言 / 授权类型 / 字体类型 / 字体风格，
 * 每组第一项是「全部」（点它清空该组）。
 */
const props = defineProps<{
  categories: Category[]
  modelValue: FilterState
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: FilterState): void }>()

function isOn(category: string, id: number) {
  return (props.modelValue[category] ?? []).includes(id)
}

function isAllOff(category: string) {
  return (props.modelValue[category] ?? []).length === 0
}

function toggle(category: string, id: number) {
  const current = props.modelValue[category] ?? []
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  emit('update:modelValue', { ...props.modelValue, [category]: next })
}

function clear(category: string) {
  emit('update:modelValue', { ...props.modelValue, [category]: [] })
}

/** 评分用星号重复，其它用文字 */
function label(tag: CategoryTag) {
  if (tag.icon === 'star_fill') return '★'.repeat(tag.repeat ?? 1)
  return tag.name ?? String(tag.id)
}
</script>

<template>
  <div class="fp">
    <section v-for="group in categories" :key="group.key" class="fp__group">
      <p class="fp__title">{{ group.name }}</p>
      <div class="fp__chips">
        <button
          v-if="group.extraTag"
          class="fp__chip"
          :class="{ 'is-on': isAllOff(group.key) }"
          type="button"
          @click="clear(group.key)"
        >
          全部
        </button>
        <button
          v-for="tag in group.tags"
          :key="tag.id"
          class="fp__chip"
          :class="{ 'is-on': isOn(group.key, tag.id) }"
          type="button"
          @click="toggle(group.key, tag.id)"
        >
          {{ label(tag) }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.fp {
  width: 240px;
  max-height: 460px;
  overflow-y: auto;
  padding: var(--sp-4);
  box-sizing: border-box;
}

.fp__group + .fp__group {
  margin-top: var(--sp-5);
}

.fp__title {
  margin: 0 0 var(--sp-3);
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  line-height: 1.4;
}

.fp__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.fp__chip {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  background: var(--c-surface-raised);
  color: var(--c-text-onchip);
  font-size: var(--fs-md);
  line-height: 16px;
  white-space: nowrap;
}

.fp__chip:hover {
  background: var(--c-surface-raised-hover);
}

.fp__chip.is-on {
  border-color: var(--accent);
  color: var(--c-text-inverse);
}
</style>
