<script setup lang="ts">
import { computed } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import GCollapse from '@/components/GCollapse.vue'
import GInput from '@/components/GInput.vue'
import GRadio from '@/components/GRadio.vue'
import GSegment from '@/components/GSegment.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import { useCommand } from '@/components/command/useCommand'
import { useFeedbackStore } from '@/stores/feedback'
import { useCommonUseOptions, useOptionRef } from '../useCommonUseOptions'

/**
 * ⑨ 导出图片（官方 `comexport`，render `Lp()` `app.v4.js:36435`）。
 *
 * 结构（`docs/生成/页面规格/05-常用.md` 的 `Lp()` 段）：
 * - 3 行「左标签 + 右控件」：品质（段选 + 数字）、保存到（输入 + 2 单选）、命名（输入 + 2 勾选）
 * - hr → 2 行整行单选（导出Web方式 / 另存为方式）
 * - hr → **3 个可展开区**（`baseOpen` → `GCollapse` 的 plain 变体）
 *
 * 导出参数 = **面板写进 `cyExport` 的整块**（官方 `getExportImage()`，`app.v4.js:37967-37975`，
 * 返回 `V.a.getKey("cyExport")`），官方随后 `jsxHistoryNoCheck("cy_ExportImage", [n], "导出图片")`（`:37993`）。
 * 所以这里不另拼对象：取 `cyExport` 整块，未被面板管理的子键（`compress.enable/level/watermark` 等）原样带上。
 */
const { options } = useCommonUseOptions()
const format = useOptionRef<string>('cyExport.ext', 'JPG')
const quality = useOptionRef<string>('cyExport.quality', '100')
const saveTo = useOptionRef<string>('cyExport.path', '')
const saveMode = useOptionRef<string>('cyExport.saveMode', 'desktop')
const fileName = useOptionRef<string>('cyExport.name', '')
const useLayerName = useOptionRef('cyExport.userLayerName', false)
const autoNumber = useOptionRef('cyExport.autoNumber', false)
const exportMode = useOptionRef<string>('cyExport.mode', 'web')
const exportOriginal = useOptionRef('cyExport.compress.exportOriginalGraph', false)
// 官方 render：导出宽度 :36686、导出高度 :36706、水印文件 :36724（都在 cyExport.compress.*）
const compressWidth = useOptionRef<string>('cyExport.compress.width', '')
const compressHeight = useOptionRef<string>('cyExport.compress.height', '')
const compressWatermark = useOptionRef<string>('cyExport.compress.watermark', '')
// 三个折叠区状态：官方 set.cyShowCompress（:36664）/ cyShowSetFolder（:36757）/ cyShowBatch（:36787）
const showCompress = useOptionRef('cyShowCompress', false)
const showSetFolder = useOptionRef('cyShowSetFolder', false)
const showBatch = useOptionRef('cyShowBatch', false)
const openAfterSave = useOptionRef('cyExport.autoOpenFolder', false)

const exportCmd = useCommand('commonUse.exportImages')
const openFolderCmd = useCommand('commonUse.openExportFolder')
const exportFolderCmd = useCommand('commonUse.exportPsdFolder')
const feedback = useFeedbackStore()

/** 当前导出参数 = 磁盘上的 `cyExport` 整块，被面板管理的字段用面板值覆盖 */
const exportOptions = computed<Record<string, unknown>>(() => {
  const disk = (options.value.cyExport ?? {}) as Record<string, unknown>
  const compress = (disk.compress ?? {}) as Record<string, unknown>
  return {
    ...disk,
    ext: format.value,
    quality: quality.value,
    path: saveTo.value,
    saveMode: saveMode.value,
    name: fileName.value,
    userLayerName: useLayerName.value,
    autoNumber: autoNumber.value,
    mode: exportMode.value,
    autoOpenFolder: openAfterSave.value,
    compress: { ...compress, exportOriginalGraph: exportOriginal.value },
  }
})

/** 官方三个导出入口：`cy_ExportImage`（单张）/ `cy_BatchExportLayer` / `cy_BatchExportSecondLayer` */
async function exportImages(mode: 'image' | 'first' | 'second') {
  const ok = await exportCmd.run({ mode, options: exportOptions.value })
  // 命令层失败会自己提示；这里补一条面板级的可见提示，避免"点了没反应"
  if (!ok) feedback.error('导出失败：请检查导出目录与参数后重试')
}
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

    <GCollapse
      variant="plain"
      title="压缩尺寸 & 加水印"
      :open="showCompress"
      @update:open="showCompress = $event"
    >
      <SettingsRow>
        <GInput v-model="compressWidth" size="small" class="u-fill" />
        <GInput v-model="compressHeight" size="small" class="u-fill" />
      </SettingsRow>
      <SettingsRow><GInput v-model="compressWatermark" size="small" class="u-fill" /></SettingsRow>
      <SettingsRow><CheckBox v-model="exportOriginal">同时导出原图</CheckBox></SettingsRow>
    </GCollapse>

    <hr class="panel-export__rule" />

    <GCollapse
      variant="plain"
      title="所在目录设置"
      :open="showSetFolder"
      @update:open="showSetFolder = $event"
    >
      <SettingsRow>
        <GButton type="primary" width="full" @click="openFolderCmd.run()">打开所在目录</GButton>
      </SettingsRow>
      <SettingsRow><CheckBox v-model="openAfterSave">保存后自动打开所在目录</CheckBox></SettingsRow>
    </GCollapse>

    <hr class="panel-export__rule" />

    <GCollapse
      variant="plain"
      title="批量导出功能"
      :open="showBatch"
      @update:open="showBatch = $event"
    >
      <SettingsRow>
        <GButton width="half" @click="exportImages('first')">导出一级图层</GButton>
        <GButton width="half" @click="exportImages('second')">导出二级图层</GButton>
      </SettingsRow>
      <SettingsRow>
        <GButton
          type="primary"
          width="full"
          @click="exportFolderCmd.run({ options: exportOptions })"
        >
          批量导出文件夹所有PSD
        </GButton>
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
