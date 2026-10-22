<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CepModal from '@/components/CepModal.vue'
import SelectBox from '@/components/SelectBox.vue'
import CheckBox from '@/components/CheckBox.vue'
import type { ActionGroup } from '@/domain/action'

/**
 * 原版 addContext（app.v4.js:55328-55577）：
 * 分组下拉 + 全选 + 动作勾选；确认时展平成 [{ group, name }]。
 */
const props = withDefaults(
  defineProps<{
    groups: ActionGroup[]
    loading?: boolean
    error?: string
    unparsed?: boolean
  }>(),
  { loading: false, error: '', unparsed: false },
)

const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{
  (e: 'confirm', items: Array<{ group: string; name: string }>): void
}>()

const current = ref(0)
const selected = ref(new Set<string>())

const group = computed(() => props.groups[current.value])
const actions = computed(() => group.value?.list ?? [])
const selectedCount = computed(() =>
  actions.value.reduce((sum, item) => sum + (selected.value.has(key(item)) ? 1 : 0), 0),
)
const checkAll = computed(
  () => actions.value.length > 0 && selectedCount.value === actions.value.length,
)
const indeterminate = computed(
  () => selectedCount.value > 0 && selectedCount.value < actions.value.length,
)

function key(item: { group: string; name: string }) {
  return `${item.group}|${item.name}`
}

watch(visible, (open) => {
  if (open) {
    current.value = 0
    selected.value = new Set()
  }
})

function toggleItem(item: { group: string; name: string }) {
  const next = new Set(selected.value)
  const k = key(item)
  if (next.has(k)) next.delete(k)
  else next.add(k)
  selected.value = next
}

function toggleAll(value: boolean) {
  selected.value = value ? new Set(actions.value.map(key)) : new Set()
}

function confirm() {
  const items = props.groups.flatMap((entry) =>
    entry.list
      .filter((item) => selected.value.has(key(item)))
      .map((item) => ({ group: item.group, name: item.name })),
  )
  emit('confirm', items)
}
</script>

<template>
  <CepModal
    v-model:visible="visible"
    class="action-card"
    title="添加动作"
    ok-text="添加"
    :width="300"
    @ok="confirm"
  >
    <div v-if="loading" class="action-add__hint">正在读取 Photoshop 动作…</div>
    <div v-else-if="error" class="action-add__hint action-add__hint--error">{{ error }}</div>
    <div v-else-if="unparsed" class="action-add__hint">
      Photoshop 返回了动作数据，但结构无法识别，已记录日志
    </div>
    <template v-else>
      <SelectBox
        v-model="current"
        class="action-add__select"
        :options="groups.map((entry, index) => ({ id: index, label: entry.groupName }))"
      />

      <div class="action-add__all">
        <CheckBox
          :model-value="checkAll"
          :indeterminate="indeterminate"
          @update:model-value="toggleAll"
        >
          全选
        </CheckBox>
      </div>

      <p v-if="!actions.length" class="action-add__hint">*该分组没有动作</p>
      <div v-else class="action-add__list">
        <div v-for="item in actions" :key="key(item)" class="action-add__item">
          <CheckBox :model-value="selected.has(key(item))" @update:model-value="toggleItem(item)">
            {{ item.name }}
          </CheckBox>
        </div>
      </div>
    </template>
  </CepModal>
</template>

<style scoped>
.action-add__select {
  margin-bottom: var(--sp-3);
}

.action-add__all {
  margin-bottom: var(--sp-2);
}

.action-add__list {
  max-height: 50vh;
  overflow-y: auto;
}

.action-add__item {
  padding: var(--sp-1) 0;
}

.action-add__hint {
  margin: 0;
  padding: var(--sp-2) 0;
  color: var(--text-faint);
  font-size: var(--fs-md);
}

.action-add__hint--error {
  color: var(--c-danger);
}
</style>
