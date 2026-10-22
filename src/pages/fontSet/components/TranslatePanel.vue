<script setup lang="ts">
import { computed } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import FontSetIcon from './FontSetIcon.vue'
import FontSetSelect from './FontSetSelect.vue'
import { LANGUAGES } from '@/domain/translate'

/**
 * 原版 translateCom（app.v4.js:38454）：
 * 起始语言 / 交换 / 结束语言 / "替换原图层"。
 * 只负责收集配置，翻译本身由命令执行。
 */
const props = defineProps<{
  from: string
  to: string
  replace: boolean
}>()

const emit = defineEmits<{
  (e: 'update', side: 'from' | 'to', code: string): void
  (e: 'swap'): void
  (e: 'replace', value: boolean): void
}>()

const labels: string[] = LANGUAGES.map((item) => item.label)
const fromLabel = computed(
  () => LANGUAGES.find((item) => item.code === props.from)?.label ?? props.from,
)
/** 原版结束语言默认显示「英文」，但它的 code 默认是 auto；不要"修"成英语 */
const toLabel = computed(
  () =>
    LANGUAGES.find((item) => item.code === props.to)?.label ??
    (props.to === 'auto' ? '英文' : props.to),
)

function pick(side: 'from' | 'to', index: number) {
  const item = LANGUAGES[index]
  if (item) emit('update', side, item.code)
}
</script>

<template>
  <div class="fontset-panel fontset-translate">
    <div class="fontset-translate__row">
      <FontSetSelect
        class="fontset-translate__lang"
        :items="labels"
        :model-value="labels.indexOf(fromLabel)"
        :display="fromLabel"
        @select="pick('from', $event)"
      />
      <FontSetIcon name="#iconzhuanhuan" title="切换翻译语言" @handle="emit('swap')" />
      <FontSetSelect
        class="fontset-translate__lang"
        :items="labels"
        :model-value="labels.indexOf(toLabel)"
        :display="toLabel"
        @select="pick('to', $event)"
      />
    </div>

    <CheckBox
      class="fontset-translate__replace"
      title="翻译结果替换原文本"
      :model-value="replace"
      @update:model-value="emit('replace', $event)"
    >
      替换原图层
    </CheckBox>
  </div>
</template>

<style scoped>
.fontset-panel {
  padding: var(--sp-exact-15) var(--sp-exact-10);
  background: var(--c-sunken);
}

.fontset-translate__row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.fontset-translate__lang {
  flex: 1;
}

.fontset-translate__replace {
  margin-top: var(--sp-exact-15);
}
</style>
