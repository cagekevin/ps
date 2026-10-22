<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GInput from '@/components/GInput.vue'
import CheckBox from '@/components/CheckBox.vue'
import FontSetRadio from './FontSetRadio.vue'
import FontSetSelect from './FontSetSelect.vue'
import type { CreateButtonConfig } from '@/domain/font-set-config'
import { CREATE_BUTTON_PADDINGS, CREATE_BUTTON_PRESETS } from '../font-set-constants'

/**
 * 原版 btnCom（app.v4.js:38941）：
 * 圆角/直角 + 线框 + 自定义边距（可输表达式）+ 8 个快速预设。
 * 任何一项变化都会立即重新生成按钮（原版 watch），所以这里 change 与 apply 一起发。
 */
const props = defineProps<{ config: CreateButtonConfig }>()
const emit = defineEmits<{
  (e: 'change', patch: Partial<CreateButtonConfig>): void
  (e: 'apply'): void
}>()

const type = computed<number>({
  get: () => props.config.type,
  set: (value) => {
    emit('change', { type: value })
    emit('apply')
  },
})

const isLine = computed<boolean>({
  get: () => props.config.isLine,
  set: (value) => {
    emit('change', { isLine: value })
    emit('apply')
  },
})

const padding = ref(props.config.padding)
watch(
  () => props.config.padding,
  (value) => {
    padding.value = value
  },
)

function commitPadding() {
  const value = padding.value.trim()
  if (!value) return
  emit('change', { padding: value })
  emit('apply')
}

function pickPreset(index: number) {
  const value = CREATE_BUTTON_PADDINGS[index]
  if (!value) return
  padding.value = value
  commitPadding()
}

function quick(value: number) {
  padding.value = `自动生成${value}`
  commitPadding()
}
</script>

<template>
  <div class="fontset-panel fontset-create">
    <div class="fontset-create__row">
      <FontSetRadio v-model="type" :label="1" title="生成圆角矩形">圆角</FontSetRadio>
      <FontSetRadio v-model="type" :label="2" title="生成直角矩形">直角</FontSetRadio>
      <CheckBox v-model="isLine" title="生成线框矩形">线框</CheckBox>
    </div>

    <div class="fontset-create__row fontset-create__row--padding">
      <p class="fontset-create__label" title="形状内边距，10,5 表示 宽=10 高=5">自定义边距</p>
      <GInput
        v-model="padding"
        class="fontset-create__input"
        placeholder="10,20"
        title="支持表达式,详细请看帮助文档"
        @enter="commitPadding"
        @blur="commitPadding"
      />
      <FontSetSelect
        class="fontset-create__preset"
        :items="CREATE_BUTTON_PADDINGS"
        :model-value="-1"
        display="预设"
        @select="pickPreset"
      />
    </div>

    <div class="fontset-create__quick">
      <button
        v-for="value in CREATE_BUTTON_PRESETS"
        :key="value"
        class="fontset-create__quick-btn"
        type="button"
        :title="`预设样式${value}`"
        @click="quick(value)"
      >
        {{ value }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.fontset-panel {
  padding: var(--sp-exact-15) var(--sp-exact-10);
  background: var(--c-sunken);
}

.fontset-create__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}

.fontset-create__row--padding {
  margin-top: var(--sp-exact-10);
}

.fontset-create__label {
  flex: 0 0 auto;
  margin: 0 var(--sp-exact-10) 0 0;
  color: var(--text);
  font-size: var(--fs-md);
}

.fontset-create__input {
  flex: 1;
}

.fontset-create__preset {
  flex: 0 0 auto;
  width: 72px;
}

.fontset-create__quick {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  margin-top: var(--sp-exact-10);
}

.fontset-create__quick-btn {
  width: calc(12.5% - var(--sp-3));
  height: var(--h-control-sm);
  padding: 0;
  border: 1px solid var(--c-input);
  border-radius: var(--r-input);
  background: var(--c-input);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.fontset-create__quick-btn:hover {
  border-color: var(--c-border-strong);
  background: var(--c-surface-raised);
}
</style>
