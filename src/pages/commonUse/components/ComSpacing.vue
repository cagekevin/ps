<script setup lang="ts">
import GInput from '@/components/GInput.vue'
import Icon from '@/components/Icon.vue'
import FontSetRadio from '@/pages/fontSet/components/FontSetRadio.vue'

/**
 * comspacing（按间距分布）子面板。
 *
 * 原版 render `Wp()`（`app.v4.js:37240`）：
 * 1 个输入 + 2 个图标按钮 + 2 个单选（按图层排序 / 按坐标排序）。
 *
 * 默认 `mode=1`（`docs/页面/05-常用.md:62`），参数顺序 `[t, width, mode]`（`:63`）。
 */
const model = defineModel<{ width: string; mode: 'layer' | 'coord' }>({ required: true })

defineEmits<{ (e: 'distribute'): void }>()
</script>

<template>
  <div class="cu-spacing">
    <div class="cu-spacing__row">
      <GInput v-model="model.width" size="small" placeholder="间距" />
      <button
        class="cu-spacing__icon"
        type="button"
        title="按图层排序"
        @click="model.mode = 'layer'"
      >
        <Icon name="iconzhongmingmingtuceng" size="sm" />
      </button>
      <button
        class="cu-spacing__icon"
        type="button"
        title="按坐标排序"
        @click="model.mode = 'coord'"
      >
        <Icon name="icondingbuduiqi" size="sm" />
      </button>
      <GButton size="small" @click="$emit('distribute')">分布元素</GButton>
    </div>
    <hr class="cu-line" />
    <FontSetRadio v-model="model.mode" label="layer">按图层排序</FontSetRadio>
    <FontSetRadio v-model="model.mode" label="coord">按坐标排序</FontSetRadio>
  </div>
</template>

<style scoped>
.cu-spacing {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) 0 0 var(--sp-exact-10);
}

.cu-spacing__row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.cu-spacing__icon {
  display: inline-flex;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.cu-line {
  width: 100%;
  height: var(--sp-exact-1);
  margin: var(--sp-3) 0;
  border: 0;
  background: var(--c-divider);
}
</style>
