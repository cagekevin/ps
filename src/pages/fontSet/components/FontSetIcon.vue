<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import type { IconSize } from '@/components/icon/size'

/**
 * 原版 baseIcon（图标按钮）。
 *
 * 与 `components/Icon` 的区别：这里带点击区、选中态和右下角标（#iconjiaobiao），
 * 只服务字体面板，所以留在页面私有目录。
 *
 * 状态机制（100% 照原版 `baseIcon`，app.v4.js 组件 + `app.bf68b505.css`）：
 * - 根节点 `.base-icon.f-center`，默认 26×26，1px 透明边框，无 padding / 无圆角
 * - `:hover` → `background:rgba(0,0,0,.2); border-color:#444`
 * - `select` → `background:#222; border-color:#444`
 * - 图标颜色始终 `currentColor`，选中不改成蓝色
 */
withDefaults(
  defineProps<{
    name: string
    title?: string
    svgSize?: IconSize | string
    width?: string
    height?: string
    selected?: boolean
    badge?: boolean
    disabled?: boolean
  }>(),
  { svgSize: '1em', width: '26px', height: '26px' },
)

const emit = defineEmits<{
  (e: 'handle', event: MouseEvent): void
  (e: 'menu', event: MouseEvent): void
  (e: 'ctrl', event: MouseEvent): void
}>()

function onClick(event: MouseEvent) {
  // handle 始终发：FontColor 的对齐按钮要靠 handle 拿到 ctrlKey
  emit('handle', event)
  if (event.ctrlKey) emit('ctrl', event)
}
</script>

<template>
  <button
    class="fontset-icon"
    :class="{ 'is-active': selected }"
    :style="{ width, height }"
    :title="title"
    :disabled="disabled"
    type="button"
    @click="onClick"
    @contextmenu.prevent="$emit('menu', $event)"
  >
    <Icon :name="name" :size="svgSize" />
    <!-- 原版角标是 baseIcon 的第二个 flex 子项：svg-4 + mt12，不是绝对定位 -->
    <Icon v-if="badge" class="fontset-icon__badge" name="#iconjiaobiao" size="3xs" />
  </button>
</template>

<style scoped>
.fontset-icon {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  /* 原版 .base-icon{height:26px;width:26px;border:1px solid transparent}：
     无 padding、无圆角、无过渡 */
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

/* 原版两条：hover 是半透明黑，选中是实色 #222；边框同为 #444，图标颜色不动。
   不另造蓝色选中态。 */
.fontset-icon:hover:not(:disabled),
.fontset-icon.is-active {
  border-color: var(--c-icon-hover-border);
}

.fontset-icon:hover:not(:disabled) {
  background: var(--c-icon-hover);
}

.fontset-icon.is-active {
  background: var(--c-icon-selected);
}

.fontset-icon:disabled {
  opacity: 0.45;
  cursor: default;
}

/* 原版角标：`baseSvg.svg-4.mt12`，作为第二个 flex 子项，margin-top 12px 压到右下 */
.fontset-icon__badge {
  margin-top: 12px;
  color: inherit;
  pointer-events: none;
}
</style>
