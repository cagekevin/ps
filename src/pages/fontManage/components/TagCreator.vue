<script setup lang="ts">
import { ref, watch } from 'vue'
import CepModal from '@/components/CepModal.vue'

/**
 * 新建 / 重命名标签。对应原版 font-manage__tag__creator（标题 + 输入 + 底部按钮）。
 * 校验交给父组件（重名、空值），这里只负责收值和回车。
 */
const props = defineProps<{
  mode: 'create' | 'rename'
  initial?: string
}>()

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{ (e: 'submit', value: string): void }>()

const text = ref('')

watch(
  () => [visible.value, props.initial] as const,
  ([open, initial]) => {
    if (open) text.value = initial ?? ''
  },
  { immediate: true },
)

function submit() {
  emit('submit', text.value.trim())
}
</script>

<template>
  <CepModal
    v-model:visible="visible"
    :title="mode === 'create' ? '新建标签' : '重命名标签'"
    :width="260"
    @ok="submit"
  >
    <input v-model="text" class="tc__input" placeholder="请输入标签名" maxlength="20" @keydown.enter="submit" />
  </CepModal>
</template>

<style scoped>
.tc__input {
  width: 100%;
  height: 30px;
  padding: 0 var(--sp-4);
  border: 1px solid var(--c-border-checked);
  border-radius: var(--r-md);
  background: var(--c-surface-raised);
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  box-sizing: border-box;
}

.tc__input::placeholder {
  color: var(--c-text-muted);
}

.tc__input:focus {
  border-color: var(--accent-soft);
  outline: none;
}
</style>
