<script setup lang="ts">
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import FontSetRadio from '@/pages/fontSet/components/FontSetRadio.vue'

/**
 * comembed（嵌入图片）子面板。
 *
 * 原版 render `up()`（`app.v4.js:35732`，`docs/生成/页面规格/05-常用.md`）：
 * 3 个勾选 + 3 选 1 单选 + 1 个勾选 + 2 个按钮。
 *
 * 只调命令（`commonUse.embedImage`），能力不在这里（C-1 定案）。
 *
 * 单选控件用**已有**的 `FontSetRadio`（原版 `baseRadio` 的同形件）：
 * 公共件准入只批了 Collapse / 单选段条 / GTile / GButton 宽度变体，
 * 没有批新的公共 GRadio；仓里已有一份等价的单选件，
 * 再写一份就是第 2 份实现。跨页引用组件在本仓是既有做法
 * （`pages/action` 就引用 `pages/freePanel/components/FreePanelRegionPicker.vue`）。
 */
const model = defineModel<{
  autoEmbedOnDrop: boolean
  autoEmbedOnPaste: boolean
  autoEmbedOnClipboardMask: boolean
  linkMode: 'none' | 'original' | 'sameFolder'
  deleteNextLayer: boolean
  linkSmartObject: boolean
}>({ required: true })

defineEmits<{
  (e: 'embed'): void
  (e: 'to-link'): void
  (e: 'to-smart-object'): void
}>()
</script>

<template>
  <div class="cu-embed">
    <CheckBox v-model="model.autoEmbedOnDrop">拖入图片自动嵌入图片</CheckBox>
    <CheckBox v-model="model.autoEmbedOnPaste">粘贴图片自动嵌入图片</CheckBox>
    <CheckBox v-model="model.autoEmbedOnClipboardMask"> 使用剪贴蒙版时自动嵌入图片 </CheckBox>

    <hr class="cu-line" />

    <FontSetRadio v-model="model.linkMode" label="none">嵌入时不存链接对象</FontSetRadio>
    <FontSetRadio v-model="model.linkMode" label="original">
      嵌入时存链接对象(图片原始路径)
    </FontSetRadio>
    <FontSetRadio v-model="model.linkMode" label="sameFolder">
      嵌入时存链接对象(与PSD同一目录)
    </FontSetRadio>
    <CheckBox v-model="model.deleteNextLayer">删除下一图层</CheckBox>

    <hr class="cu-line" />

    <CheckBox v-model="model.linkSmartObject">拖入图片转成链接智能对象</CheckBox>

    <hr class="cu-line" />

    <div class="cu-row">
      <GButton width="half" @click="$emit('to-link')">转链接智能对象</GButton>
      <GButton width="half" @click="$emit('to-smart-object')">转智能对象</GButton>
    </div>
  </div>
</template>

<style scoped>
.cu-embed {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.cu-line {
  width: 100%;
  height: var(--sp-exact-1);
  margin: var(--sp-3) 0;
  border: 0;
  background: var(--c-divider);
}

.cu-row {
  display: flex;
  gap: var(--sp-2);
}
</style>
