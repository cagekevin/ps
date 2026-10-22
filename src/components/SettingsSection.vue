<script setup lang="ts">
import GCollapse from '@/components/GCollapse.vue'

/**
 * 设置页折叠块的**薄包装**。
 *
 * C-3 定案（`docs/组件库/页面契约.md:485`）：折叠实现收进通用 `GCollapse`，
 * `SettingsSection` 只做 variant 映射，**只换内部实现、不改视觉**——
 * 间距、字号、颜色全部由 GCollapse 给出，值与原实现逐条对应。
 *
 * 原版设置页的 `open` 组件（`docs/生成/页面规格/08-设置.md:364-390`，render `lS()` 55221，
 * 该页 7 处折叠行头）由这个组件替代（T-68）：`open` 的默认文案「显示更多」/`value:false`
 * （`docs/页面/08-设置.md:58`）就是「收起 + 可展开」的语义，`defaultOpen` 覆盖展开态。
 * 没有把 `open` 的 hover 方块按钮搬过来——那部分行为原版未提取（v-if 分支没展开），
 * 见 `docs/页面/08-设置.md` 组件表的 ☐ 行。
 */
withDefaults(
  defineProps<{
    title: string
    defaultOpen?: boolean
    /** section：一级黑底块；sub：二级透明行 */
    variant?: 'section' | 'sub'
  }>(),
  { defaultOpen: false, variant: 'section' },
)

const emit = defineEmits<{ (e: 'toggle', open: boolean): void }>()
</script>

<template>
  <GCollapse
    class="setting-section"
    :title="title"
    :variant="variant"
    :default-open="defaultOpen"
    @toggle="emit('toggle', $event)"
  >
    <slot />
  </GCollapse>
</template>

<style scoped>
/* SettingsRow 用 var(--set-gap) 定行内间距；这里保留这一个出口，其余全在 GCollapse */
.setting-section {
  --set-gap: var(--sp-4);
}
</style>
