<script setup lang="ts">
import Icon from '@/components/Icon.vue'

/**
 * 原版 baseGroup（app.v4.js:2564-2621）：
 * 折叠箭头 + 标题 + 可选 header 插槽；展开后渲染默认插槽。
 *
 * 跨页共用（`docs/组件库/现有控件.md` 曾把它登记成"只属于动作页"，那是分类过期）：
 * 原版同一个 `baseGroup` 同时给动作页（`app.v4.js:55086`）和样式页四库（`:49939` 等）用，
 * 这里保持同一份——样式页不再写第二个折叠组头。
 */
const props = withDefaults(
  defineProps<{
    text: string
    value: boolean
  }>(),
  { text: '显示更多', value: false },
)

const emit = defineEmits<{
  (e: 'change', value: boolean): void
  (e: 'menu', event: MouseEvent): void
  (e: 'ctrl', event: MouseEvent): void
}>()

function onHeadClick(event: MouseEvent) {
  if (event.ctrlKey) {
    emit('ctrl', event)
    return
  }
  emit('change', !props.value)
}
</script>

<template>
  <div class="base-group">
    <div class="base-group__head" @click="onHeadClick" @contextmenu.prevent="emit('menu', $event)">
      <Icon
        class="base-group__chevron"
        :class="{ 'is-closed': !value }"
        name="#iconzhankaizhedie"
        size="2xs"
      />
      <p class="base-group__text">{{ text }}</p>
      <slot name="header" />
    </div>
    <slot v-if="value" />
  </div>
</template>

<style scoped>
.base-group {
  width: 100%;
}

.base-group__head {
  display: flex;
  width: 100%;
  height: 22px;
  align-items: center;
  cursor: pointer;
}

/* 原版箭头是 `.icon`，取全局 `.icon{color:#c3c3c3}`（`app.bf68b505.css` 字节 4069 区），
   hover 时 `.base-group-mian:hover p,.base-group-mian:hover svg{color:#fff}`（字节 27361 区） */
.base-group__chevron {
  flex: 0 0 auto;
  color: var(--text);
  transition: transform var(--dur-fast) var(--ease);
}

.base-group__chevron.is-closed {
  transform: rotate(-90deg);
}

.base-group__head:hover .base-group__text,
.base-group__head:hover .base-group__chevron {
  color: var(--c-text-inverse);
}

/* 原版 `<p class="ml8">`（render `:2607-2608`），`.ml8{margin-left:8px}` → --sp-4 = 8px */
.base-group__text {
  margin: 0 0 0 var(--sp-4);
  color: var(--text);
  font-size: var(--fs-md);
}
</style>
