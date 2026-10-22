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
  min-height: 28px;
  align-items: center;
  gap: var(--set-gap, 8px);
}
</style>
