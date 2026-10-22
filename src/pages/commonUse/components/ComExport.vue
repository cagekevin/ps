<script setup lang="ts">
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import GCollapse from '@/components/GCollapse.vue'
import GInput from '@/components/GInput.vue'
import GSegment from '@/components/GSegment.vue'
import SelectBox from '@/components/SelectBox.vue'
import FontSetRadio from '@/pages/fontSet/components/FontSetRadio.vue'
import { EXPORT_FORMATS, PNG_DEPTHS } from '../types'

/**
 * comexport（批量导出）子面板。
 *
 * 原版 render `Lp()`（`app.v4.js:36435`，`docs/生成/页面规格/05-常用.md`）：
 * 格式段选 + 品质 + 保存到 + 命名 + 2 个单选 + 3 个折叠区（`baseOpen`）+ 4 个按钮。
 *
 * 段选用**单选段条** `GSegment`（C-4 定案）：原版 `.switch-wrap` + `.switch-shape`，
 * 单选语义与 `MultiTabs`（多选）不同，不能合并。
 * 折叠行用 `GCollapse` 的 `plain` 变体（C-3 定案：原版 `baseOpen`）。
 */
const model = defineModel<{
  format: number
  quality: string
  pngDepth: number
  saveTo: 'desktop' | 'folder'
  folder: string
  name: string
  useLayerName: boolean
  autoNumber: boolean
  exportMode: 'web' | 'saveAs'
  sliceWidth: string
  sliceHeight: string
  alsoOriginal: boolean
  autoOpenFolder: boolean
}>({ required: true })

defineEmits<{
  (e: 'export', mode: 'image' | 'first' | 'second' | 'psd'): void
  (e: 'open-folder'): void
}>()

const depthOptions = PNG_DEPTHS.map((label, index) => ({ id: index, label }))
</script>

<template>
  <div class="cu-export">
    <div class="cu-export__row">
      <GSegment v-model="model.format" :labels="EXPORT_FORMATS" />
      <span class="cu-export__label">品质</span>
      <GInput v-model="model.quality" size="small" placeholder="1-100" class="cu-export__q" />
      <SelectBox
        v-if="model.format === 1"
        v-model="model.pngDepth"
        :options="depthOptions"
        class="cu-export__depth"
      />
    </div>

    <div class="cu-export__row">
      <span class="cu-export__label">保存到</span>
      <GInput v-model="model.folder" size="small" placeholder="目录" />
      <FontSetRadio v-model="model.saveTo" label="desktop">桌面</FontSetRadio>
      <FontSetRadio v-model="model.saveTo" label="folder">文件所在目录</FontSetRadio>
    </div>

    <div class="cu-export__row">
      <span class="cu-export__label">命名</span>
      <GInput v-model="model.name" size="small" placeholder="文件名" />
      <CheckBox v-model="model.useLayerName">图层名</CheckBox>
      <CheckBox v-model="model.autoNumber">自动编号</CheckBox>
    </div>

    <hr class="cu-line" />

    <FontSetRadio v-model="model.exportMode" label="web"> 使用导出Web方式(可以切片) </FontSetRadio>
    <FontSetRadio v-model="model.exportMode" label="saveAs"> 使用另存为方式(不压缩) </FontSetRadio>

    <hr class="cu-line" />

    <GCollapse variant="plain">
      <template #title>切片</template>
      <div class="cu-export__row">
        <GInput v-model="model.sliceWidth" size="small" placeholder="宽" />
        <GInput v-model="model.sliceHeight" size="small" placeholder="高" />
      </div>
      <CheckBox v-model="model.alsoOriginal">同时导出原图</CheckBox>
    </GCollapse>

    <hr class="cu-line" />

    <GCollapse variant="plain">
      <template #title>目录</template>
      <GButton width="full" @click="$emit('open-folder')">打开所在目录</GButton>
      <CheckBox v-model="model.autoOpenFolder">保存后自动打开所在目录</CheckBox>
    </GCollapse>

    <hr class="cu-line" />

    <GCollapse variant="plain">
      <template #title>批量导出</template>
      <GButton width="half" @click="$emit('export', 'first')">导出一级图层</GButton>
      <GButton width="half" @click="$emit('export', 'second')">导出二级图层</GButton>
      <GButton width="full" @click="$emit('export', 'psd')">批量导出文件夹所有PSD</GButton>
    </GCollapse>
  </div>
</template>

<style scoped>
.cu-export {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding-top: var(--sp-3);
}

.cu-export__row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.cu-export__label {
  flex: 0 0 auto;
  color: var(--text);
  font-size: var(--fs-md);
}

.cu-export__q {
  flex: 0 0 70px;
}

.cu-export__depth {
  flex: 0 0 90px;
}

.cu-line {
  width: 100%;
  height: var(--sp-exact-1);
  margin: var(--sp-3) 0;
  border: 0;
  background: var(--c-divider);
}
</style>
