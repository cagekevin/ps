<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    defaultOpen?: boolean
    /** section：一级黑底块；sub：二级透明行 */
    variant?: 'section' | 'sub'
  }>(),
  { defaultOpen: false, variant: 'section' },
)

const open = ref(props.defaultOpen)
const emit = defineEmits<{ (e: 'toggle', open: boolean): void }>()

function toggle() {
  open.value = !open.value
  emit('toggle', open.value)
}
</script>

<template>
  <section class="setting-section" :class="`setting-section--${variant}`">
    <button class="setting-section__head" type="button" :aria-expanded="open" @click="toggle">
      <span
        v-if="variant === 'sub'"
        class="setting-section__arrow setting-section__arrow--left"
        :class="{ 'is-open': open }"
      />
      <span class="setting-section__title">{{ title }}</span>
      <span
        v-if="variant === 'section'"
        class="setting-section__arrow"
        :class="{ 'is-open': open }"
      />
    </button>

    <div v-show="open" class="setting-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/* 设置页唯一间距出口：只在这里定义，页面不再写 padding/margin */
.setting-section {
  --set-pad-x: var(--sp-exact-10);
  --set-pad-y: var(--sp-exact-10);
  --set-gap: var(--sp-4);
  --set-head-h: var(--h-control);
  width: 100%;
  margin: 0;
  padding: 0;
}

.setting-section__head {
  display: flex;
  width: 100%;
  height: var(--set-head-h);
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 0 var(--set-pad-x);
  border: 0;
  background: transparent;
  color: var(--text-strong);
  font-size: var(--fs-sm);
  line-height: var(--set-head-h);
  text-align: left;
  cursor: pointer;
}

.setting-section__arrow {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-top: 1px solid currentColor;
  border-right: 1px solid currentColor;
  transform: rotate(45deg);
}

.setting-section__arrow.is-open {
  transform: rotate(135deg);
}

.setting-section__arrow--left {
  transform: rotate(-45deg);
}

.setting-section__arrow--left.is-open {
  transform: rotate(45deg);
}

.setting-section--section + .setting-section--section {
  margin-top: var(--set-gap);
}

.setting-section__body {
  display: flex;
  flex-direction: column;
  gap: var(--set-gap);
  margin: var(--set-gap) 0 0;
  padding: var(--set-pad-y) var(--set-pad-x);
  background: var(--c-sunken);
  color: var(--text);
  font-size: var(--fs-sm);
  line-height: var(--icon-sm);
}

.setting-section--sub .setting-section__head {
  justify-content: flex-start;
  gap: var(--sp-3);
  padding: 0;
}

.setting-section--sub .setting-section__body {
  margin: 0;
  padding: 0 0 0 var(--sp-6);
  background: transparent;
}
</style>
