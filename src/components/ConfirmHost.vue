<script setup lang="ts">
import { msg } from '@/domain/messages'
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
    :ok-text="store.options.okText ?? msg.confirm.text.modalOk"
    :cancel-text="store.options.cancelText ?? msg.confirm.text.modalCancel"
    @ok="store.resolve(true)"
  >
    {{ store.options.message }}
  </CepModal>
</template>
