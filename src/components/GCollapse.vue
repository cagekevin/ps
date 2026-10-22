<script setup lang="ts">
import { ref } from 'vue'

/**
 * 通用折叠行（用户批准的「Collapse」，文件名按 G-UI 基础件惯例取 `GCollapse`）。
 *
 * 原版两处：
 * - `baseOpen`（`/custom` 说明块、`/commonUse` 的 comexport）
 * - `/set` 页的 `SettingsSection`（variant="section" / "sub"）
 *
 * 视觉：head 高度 `--h-control`，箭头 6px 折角，body 背景 `--c-sunken`。
 * 选型理由见 `docs/组件库/页面契约.md` C-3：SettingsSection 收成它的薄包装，
 * 避免出现第 3、第 4 份折叠实现。
 */
const props = withDefaults(
  defineProps<{
    /** 标题文案；不传则不渲染文字（只留箭头） */
    title?: string
    /** section：一级块（黑底 body）；sub：二级行（透明 body）；plain：原版 baseOpen 说明块 */
    variant?: 'section' | 'sub' | 'plain'
    defaultOpen?: boolean
  }>(),
  { variant: 'section', defaultOpen: false },
)

const open = ref(props.defaultOpen)
const emit = defineEmits<{ (e: 'toggle', open: boolean): void }>()

function toggle() {
  open.value = !open.value
  emit('toggle', open.value)
}
</script>

<template>
  <section class="g-collapse" :class="`g-collapse--${variant}`">
    <button class="g-collapse__head" type="button" :aria-expanded="open" @click="toggle">
      <span
        v-if="variant === 'sub'"
        class="g-collapse__arrow g-collapse__arrow--left"
        :class="{ 'is-open': open }"
      />
      <span v-if="title" class="g-collapse__title">{{ title }}</span>
      <!-- sub 变体只画左箭头（原版 `.setting-section--sub` 只有左箭头）；
           plain 是 /custom 的 baseOpen 说明块，折叠 affordance 用右箭头 -->
      <span v-if="variant !== 'sub'" class="g-collapse__arrow" :class="{ 'is-open': open }" />
    </button>

    <div v-show="open" class="g-collapse__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/* 折叠行的间距出口：外部只改变量，不改选择器 */
.g-collapse {
  --g-collapse-pad-x: var(--sp-exact-10);
  --g-collapse-pad-y: var(--sp-exact-10);
  --g-collapse-gap: var(--sp-4);
  --g-collapse-head-h: var(--h-control);
  width: 100%;
  margin: 0;
  padding: 0;
}

.g-collapse__head {
  display: flex;
  width: 100%;
  height: var(--g-collapse-head-h);
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 0 var(--g-collapse-pad-x);
  border: 0;
  background: transparent;
  color: var(--text-strong);
  font-size: var(--fs-sm);
  line-height: var(--g-collapse-head-h);
  text-align: left;
  cursor: pointer;
}

.g-collapse__arrow {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-top: 1px solid currentColor;
  border-right: 1px solid currentColor;
  transform: rotate(45deg);
}

.g-collapse__arrow.is-open {
  transform: rotate(135deg);
}

.g-collapse__arrow--left {
  transform: rotate(-45deg);
}

.g-collapse__arrow--left.is-open {
  transform: rotate(45deg);
}

.g-collapse--section + .g-collapse--section {
  margin-top: var(--g-collapse-gap);
}

.g-collapse__body {
  display: flex;
  flex-direction: column;
  gap: var(--g-collapse-gap);
  margin: var(--g-collapse-gap) 0 0;
  padding: var(--g-collapse-pad-y) var(--g-collapse-pad-x);
  background: var(--c-sunken);
  color: var(--text);
  font-size: var(--fs-sm);
  line-height: var(--icon-sm);
}

.g-collapse--sub .g-collapse__head {
  justify-content: flex-start;
  gap: var(--sp-3);
  padding: 0;
}

.g-collapse--sub .g-collapse__body {
  margin: 0;
  padding: 0 0 0 var(--sp-6);
  background: transparent;
}

/* 原版 baseOpen 说明块：`.theme-mt-row.app-padding`（margin-top:12px; padding-left:10px） */
.g-collapse--plain {
  margin-top: var(--sp-exact-12);
}

.g-collapse--plain .g-collapse__head {
  justify-content: flex-start;
  height: auto;
  padding: 0 0 0 var(--sp-exact-10);
  line-height: var(--fs-md);
}

.g-collapse--plain .g-collapse__body {
  margin: 0;
  padding: 0 0 0 var(--sp-exact-10);
  background: transparent;
}
</style>
