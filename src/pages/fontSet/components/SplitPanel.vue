<script setup lang="ts">
import { SPLIT_BUTTONS, SPLIT_TITLES } from '../font-set-constants'

/** 原版 split（app.v4.js:38866）：2×2 四个按钮，点了就走命令 */
const emit = defineEmits<{ (e: 'split', mode: 1 | 2 | 3 | 4): void }>()

function run(index: number) {
  emit('split', (index + 1) as 1 | 2 | 3 | 4)
}
</script>

<template>
  <div class="fontset-panel fontset-split">
    <button
      v-for="(text, index) in SPLIT_BUTTONS"
      :key="text"
      class="fontset-split__btn"
      type="button"
      :title="SPLIT_TITLES[index]"
      @click="run(index)"
    >
      {{ text }}
    </button>
  </div>
</template>

<style scoped>
.fontset-panel {
  padding: var(--sp-exact-15) var(--sp-exact-10) var(--sp-exact-5);
  background: var(--c-sunken);
}

.fontset-split {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.fontset-split__btn {
  width: calc(50% - var(--sp-3));
  height: var(--h-control-sm);
  border: 1px solid var(--c-input);
  border-radius: var(--r-md);
  background: var(--c-input);
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  cursor: pointer;
}

.fontset-split__btn:hover {
  border-color: var(--c-border-strong);
  background: var(--c-surface-raised);
}
</style>
