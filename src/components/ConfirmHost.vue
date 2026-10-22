<script setup lang="ts">
import { computed } from 'vue'
import CepModal from '@/components/CepModal.vue'
import { useConfirmStore } from '@/stores/confirm'

const store = useConfirmStore()

const visible = computed({
  get: () => store.visible,
  set: (value: boolean) => {
    if (!value) store.resolve(false)
  },
})
</script>

<template>
  <CepModal
    v-model:visible="visible"
    :title="store.options.title ?? '确认'"
    :ok-text="store.options.okText ?? '确定'"
    :cancel-text="store.options.cancelText ?? '取消'"
    @ok="store.resolve(true)"
  >
    {{ store.options.message }}
  </CepModal>
</template>
