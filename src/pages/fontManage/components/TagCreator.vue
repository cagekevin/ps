<script setup lang="ts">
import { ref, watch } from 'vue'
import CepModal from '@/components/CepModal.vue'
import TagInput from './TagInput.vue'

/**
 * 新建 / 重命名标签。对应原版 font-manage-font-creator（标题 + 输入 + 底部按钮）。
 * 校验交给父组件（重名、空值），这里只负责收值和回车。
 * 输入框与原版一致地复用 TagInput（`font-manage__tag__input`，T-53）。
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
    <TagInput
      v-model="text"
      variant="modal"
      placeholder="请输入标签名"
      :maxlength="20"
      :clearable="false"
      @enter="submit"
    />
  </CepModal>
</template>
