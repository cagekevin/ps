<script setup lang="ts">
import { ref } from 'vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import GRadio from '@/components/GRadio.vue'
import Icon from '@/components/Icon.vue'
import SettingsRow from '@/components/SettingsRow.vue'

/**
 * ⑬ 按间距分布（官方 `comspacing`，render `Wp()` `app.v4.js:37240`）。
 * 结构：「输入(flex:1) + 两个图标按钮」→ hr → 一行两个单选（`:37252-37321`）。
 * 官方两个图标按钮的作用未提取（`baseIcon` 的 name 在 render 里是变量）→ 用通用图标 + `UNVERIFIED`。
 */
const gap = ref('10')
const sortBy = ref<'layer' | 'coordinate'>('layer')
</script>

<template>
  <div class="panel-spacing">
    <SettingsRow>
      <GInput v-model="gap" size="small" class="u-fill" />
      <!-- 两颗按钮的图标名与行为：`#iconshuipingjuzhongfenbu` → handle(1)、`#iconchuizhijuzhongfenbu` → handle(2)（app.v4.js:37275 / :37291） -->
      <GButton type="text" size="small" aria-label="按间距水平分布">
        <Icon name="#iconshuipingjuzhongfenbu" size="lg" />
      </GButton>
      <GButton type="text" size="small" aria-label="按间距垂直分布">
        <Icon name="#iconchuizhijuzhongfenbu" size="lg" />
      </GButton>
    </SettingsRow>

    <hr class="panel-spacing__rule" />

    <SettingsRow>
      <GRadio v-model="sortBy" value="layer">按图层排序</GRadio>
      <GRadio v-model="sortBy" value="coordinate">按坐标排序</GRadio>
    </SettingsRow>
  </div>
</template>

<style scoped>
.panel-spacing {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-5) 0;
}

.panel-spacing__rule {
  height: 1px;
  margin: var(--sp-2) 0;
  border: none;
  background: var(--c-divider);
}
</style>
