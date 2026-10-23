<script setup lang="ts">
/** 设置页横向行：唯一 gap 出口，页面不再写 u-row/u-gap */
</script>

<template>
  <div class="setting-row">
    <slot />
  </div>
</template>

<style scoped>
.setting-row {
  display: flex;
  /* 行高出口：设置页用 28px（默认）；常用页的行高由内容定（官方勾选行 12px 字 + 10px 行距），传 0 */
  min-height: var(--set-row-min-h, 28px);
  align-items: center;
  gap: var(--set-gap, 8px);
}
</style>
