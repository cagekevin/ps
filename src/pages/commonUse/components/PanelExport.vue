<script setup lang="ts">
import { ref } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import GCollapse from '@/components/GCollapse.vue'
import GInput from '@/components/GInput.vue'
import GRadio from '@/components/GRadio.vue'
import GSegment from '@/components/GSegment.vue'
import SettingsRow from '@/components/SettingsRow.vue'

/**
 * ⑨ 导出图片（官方 `comexport`，render `Lp()` `app.v4.js:36435`）。
 *
 * 结构（`docs/生成/页面规格/05-常用.md` 的 `Lp()` 段）：
 * - 3 行「左标签 + 右控件」：品质（段选 + 输入/PNG 下拉）、保存到（输入 + 2 单选）、命名（输入 + 2 勾选）
 * - hr → 2 行整行单选（导出Web方式 / 另存为方式）
 * - hr → **3 个可展开区**（`baseOpen`，用 `GCollapse` 的 plain 变体）
 *
 * 默认全部收起（`UNVERIFIED`：官方 `baseOpen` 的默认 state 未提取，截图是整页收起态）。
 * TODO(T-88): 参数应落 `cyExport`（官方 `getExportImage()`，`:37967`），本轮只做界面。
 */
const format = ref<'JPG' | 'PNG'>('JPG')
const quality = ref('100')
const saveTo = ref('')
const saveMode = ref<'desktop' | 'sameFolder'>('desktop')
const fileName = ref('')
const useLayerName = ref(false)
const autoNumber = ref(false)
const exportMode = ref<'web' | 'saveAs'>('web')
// 折叠区里的两个勾选（本轮只做界面，持久化见 TODO(T-88)）
const exportOriginal = ref(false)
const openAfterSave = ref(false)
</script>

<template>
  <div class="panel-export">
    <SettingsRow>
      <span class="panel-export__label">品质</span>
      <GSegment
        v-model="format"
        :options="[
          { value: 'JPG', label: 'JPG' },
          { value: 'PNG', label: 'PNG' },
        ]"
      />
      <GInput v-model="quality" size="small" class="panel-export__num" />
    </SettingsRow>

    <SettingsRow>
      <span class="panel-export__label">保存到</span>
      <GInput v-model="saveTo" size="small" class="u-fill" />
      <GRadio v-model="saveMode" value="desktop">桌面</GRadio>
      <GRadio v-model="saveMode" value="sameFolder">文件所在目录</GRadio>
    </SettingsRow>

    <SettingsRow>
      <span class="panel-export__label">命名</span>
      <GInput v-model="fileName" size="small" class="u-fill" />
      <CheckBox v-model="useLayerName">图层名</CheckBox>
      <CheckBox v-model="autoNumber">自动编号</CheckBox>
    </SettingsRow>

    <hr class="panel-export__rule" />

    <SettingsRow>
      <GRadio v-model="exportMode" value="web">使用导出Web方式(可以切片)</GRadio>
    </SettingsRow>
    <SettingsRow>
      <GRadio v-model="exportMode" value="saveAs">使用另存为方式(不压缩)</GRadio>
    </SettingsRow>

    <hr class="panel-export__rule" />

    <GCollapse variant="plain" title="压缩尺寸 & 加水印">
      <SettingsRow>
        <GInput size="small" class="u-fill" />
        <GInput size="small" class="u-fill" />
      </SettingsRow>
      <SettingsRow><GInput size="small" class="u-fill" /></SettingsRow>
      <SettingsRow><CheckBox v-model="exportOriginal">同时导出原图</CheckBox></SettingsRow>
    </GCollapse>

    <hr class="panel-export__rule" />

    <GCollapse variant="plain" title="所在目录设置">
      <SettingsRow>
        <GButton type="primary" width="full">打开所在目录</GButton>
      </SettingsRow>
      <SettingsRow><CheckBox v-model="openAfterSave">保存后自动打开所在目录</CheckBox></SettingsRow>
    </GCollapse>

    <hr class="panel-export__rule" />

    <GCollapse variant="plain" title="批量导出功能">
      <SettingsRow>
        <GButton width="half">导出一级图层</GButton>
        <GButton width="half">导出二级图层</GButton>
      </SettingsRow>
      <SettingsRow>
        <GButton type="primary" width="full">批量导出文件夹所有PSD</GButton>
      </SettingsRow>
    </GCollapse>
  </div>
</template>

<style scoped>
.panel-export {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-5) 0;
}

.panel-export__label {
  flex: none;
  color: var(--text);
  font-size: var(--fs-md);
}

/* 品质输入：官方 `.switch-input` 宽 70 高 30（CSS 位置 111045 段） */
.panel-export__num {
  width: 70px;
  flex: none;
}

.panel-export__rule {
  height: 1px;
  margin: var(--sp-2) 0;
  border: none;
  background: var(--c-divider);
}
</style>
