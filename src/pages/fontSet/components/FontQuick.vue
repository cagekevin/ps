<script setup lang="ts">
import { computed } from 'vue'
import FontSetIcon from './FontSetIcon.vue'
import FontSetSelect from './FontSetSelect.vue'
import type { QuickFont } from '@/domain/font-set-config'
import { visibleWeights } from '@/domain/quick-font'

/**
 * 原版 fontSetQuick（app.v4.js:40009）：
 * 快捷字体下拉（可增删）+ 最多 7 个字重图标（点了才真正换字体）。
 */
const props = defineProps<{
  show: boolean
  fonts: QuickFont[]
  index: number
}>()

const emit = defineEmits<{
  (e: 'select', index: number): void
  (e: 'apply', weightIndex: number): void
  (e: 'add'): void
  (e: 'remove', index: number): void
}>()

const labels = computed(() => props.fonts.map((font) => font.family))
const current = computed(() => props.fonts[props.index] ?? null)
const weights = computed(() => (current.value ? visibleWeights(current.value) : []))
</script>

<template>
  <div v-if="show" class="fontset-quick">
    <div class="fontset-quick__select">
      <FontSetSelect
        :items="labels"
        :model-value="index"
        placeholder="请选择字体"
        check
        remove
        plain
        @select="emit('select', $event)"
        @remove="emit('remove', $event)"
      >
        <template #footer>
          <button class="fontset-quick__add" type="button" @click="emit('add')">
            添加当前图层字体
          </button>
        </template>
      </FontSetSelect>
    </div>

    <div class="fontset-quick__weights">
      <FontSetIcon
        v-for="(weight, weightIndex) in weights"
        :key="weight"
        :name="`#iconzihaodaxiao${weightIndex + 1}`"
        :title="weight"
        :selected="false"
        @handle="emit('apply', weightIndex)"
      />
    </div>
  </div>
</template>

<style scoped>
/* 原版 fontSetQuick 根是 w100，无 padding；字体行整宽，字重行才 app-padding */
.fontset-quick {
  width: 100%;
}

.fontset-quick__select {
  width: 100%;
  margin-top: var(--sp-exact-10);
}

/* 原版字重行：f-alignNone app-padding mt4；baseIcon 默认 26×26 / svg 20 */
.fontset-quick__weights {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--sp-2);
  padding: 0 var(--sp-exact-10);
}

.fontset-quick__add {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  border-top: 1px solid var(--c-border-float);
  background: transparent;
  color: var(--accent);
  font-size: var(--fs-md);
  text-align: left;
  cursor: pointer;
}

.fontset-quick__add:hover {
  background: var(--c-hover-2);
}
</style>
