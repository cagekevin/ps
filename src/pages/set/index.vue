<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import CheckBox from '@/components/CheckBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import GButton from '@/components/GButton.vue'
import PageShell from '@/components/PageShell.vue'
import SelectBox from '@/components/SelectBox.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import SettingsSection from '@/components/SettingsSection.vue'
import { useCommand } from '@/components/command/useCommand'
import { usePersistedRef } from '@/composables/usePersisted'
import { useCloudStore } from '@/stores/cloud'
import { UNITS } from '@/domain/units'
import { formatPresetText } from '@/domain/font-preset-text'
import { useFontSetStore } from '@/stores/font-set'
import { useNavStore } from '@/stores/nav'
import AddcomDialog from './components/AddcomDialog.vue'
import ClearCacheDialog from './components/ClearCacheDialog.vue'

const cloud = useCloudStore()
const nav = useNavStore()
const fontSet = useFontSetStore()
const { status } = storeToRefs(cloud)
const autoSyncCmd = useCommand('cloud.setAutoSync')
const saveFontSettings = useCommand('fontSet.saveSettings')
const copyShortcutScripts = useCommand('system.copyToScripts')
const resetShortcutScripts = useCommand('system.resetQuickKeys')
const buildTime = __BUILD_TIME__

const navTips = usePersistedRef('nav.tips', true)
const navHoverSwitch = usePersistedRef('nav.hoverSwitch', false)
const navAutoJump = usePersistedRef('nav.autoJump', false)

const autoSync = computed({
  get: () => status.value.autoSyncEnabled,
  set: (enabled: boolean) => {
    void autoSyncCmd.run({ enabled }).then((ok) => {
      if (ok) cloud.refresh()
    })
  },
})

function fontSetting(key: 'ztShowQuick' | 'ztShowCustom' | 'ztExpandMultiple') {
  return computed({
    get: () => fontSet.settings[key],
    set: (value: boolean) => {
      const previous = fontSet.settings[key]
      fontSet.settings[key] = value
      void saveFontSettings.run({ patch: { [key]: value } }).then((applied) => {
        if (!applied) fontSet.settings[key] = previous
      })
    },
  })
}

const showQuick = fontSetting('ztShowQuick')
const showCustom = fontSetting('ztShowCustom')
const expandMultiple = fontSetting('ztExpandMultiple')

/**
 * 字体面板三组预设。原版是三个按钮「配置字号 / 配置行间距 / 配置字间距」开 `addcom`
 * （`docs/生成/页面规格/08-设置.md:69-76`），值本身是数组（`domain/font-set-config.ts:67-69`），
 * 原来这里的三个单行输入框只能存一个数，是能力缺失。
 *
 * UNVERIFIED: 原版 `dropOpen` 只写了 `addDataVal` / `addText` 两个 prop（`docs/页面/08-设置.md:81`），
 * 确定后落哪个设置字段未提取；本版按字段名落到 `ztDefaultSize` / `ztDefaultLeading` / `ztDefaultTracking`
 * （字体面板读的同一份数组）。
 */
const PRESET_FIELDS = [
  { key: 'ztDefaultSize', label: '配置字号' },
  { key: 'ztDefaultLeading', label: '配置行间距' },
  { key: 'ztDefaultTracking', label: '配置字间距' },
] as const

type PresetKey = (typeof PRESET_FIELDS)[number]['key']

const editingPreset = ref<PresetKey | null>(null)

const presetVisible = computed({
  get: () => editingPreset.value !== null,
  set: (visible: boolean) => {
    if (!visible) editingPreset.value = null
  },
})

const presetTitle = computed(
  () => PRESET_FIELDS.find((field) => field.key === editingPreset.value)?.label ?? '',
)

const presetText = computed(() =>
  editingPreset.value ? formatPresetText(fontSet.settings[editingPreset.value]) : '',
)

async function submitPreset(values: number[]) {
  const key = editingPreset.value
  if (!key) return
  const previous = [...fontSet.settings[key]]
  fontSet.settings[key] = values
  editingPreset.value = null
  const ok = await saveFontSettings.run({ patch: { [key]: values } })
  if (!ok) fontSet.settings[key] = previous
}

/** 原版「清理缓存」是设置页底部一条 bar（`生成/页面规格/08-设置.md:91-98`） */
const cacheVisible = ref(false)

const unitIndex = computed({
  get: () => {
    const index = UNITS.findIndex((item) => item.value === fontSet.settings.appUnit)
    return index < 0 ? 0 : index
  },
  set: (index: number) => {
    const previous = fontSet.settings.appUnit
    const unit = UNITS[index]
    if (!unit) return
    fontSet.settings.appUnit = unit.value
    void saveFontSettings.run({ patch: { appUnit: unit.value } }).then((savedUnit) => {
      if (!savedUnit) fontSet.settings.appUnit = previous
    })
  },
})

// 空态：快捷键分组与常用功能面板本版不提供配置项，脚本仍按原版 5 组模板生成（T-50）
const SHORTCUT_GROUPS = ['左侧栏', '框架模板', '常用功能', '字体面板', '批量套版'] as const

const copying = computed(() => copyShortcutScripts.running.value)
const refreshing = computed(() => resetShortcutScripts.running.value)

function copyScripts() {
  void copyShortcutScripts.run({ groups: [...SHORTCUT_GROUPS] }, '已拷贝配置文件')
}

function refreshScripts() {
  void resetShortcutScripts.run({ groups: [...SHORTCUT_GROUPS] }, '刷新成功')
}

onMounted(async () => {
  cloud.refresh()
  await fontSet.load()
})
</script>

<template>
  <PageShell title="设置">
    <SettingsSection title="使用设置">
      <SettingsRow>
        <span class="u-nowrap">单位</span>
        <SelectBox v-model="unitIndex" class="u-fill" :options="UNITS" />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection title="基本设置">
      <CheckBox v-model="showQuick">开启快捷切换字体粗细</CheckBox>
      <CheckBox v-model="showCustom">开启自定义层级</CheckBox>
      <CheckBox v-model="expandMultiple">允许同时展开</CheckBox>
    </SettingsSection>

    <SettingsSection title="左侧栏菜单">
      <CheckBox v-model="navTips">显示提示框</CheckBox>
      <CheckBox v-model="navHoverSwitch">鼠标滑入切换选项卡</CheckBox>
      <CheckBox v-model="navAutoJump">选择文字/普通图层自动跳转</CheckBox>

      <SettingsSection title="显示 / 隐藏选项卡" variant="sub">
        <CheckBox
          v-for="item in nav.allItems"
          :key="item.path"
          :model-value="!nav.isHidden(item.path)"
          @update:model-value="nav.setVisible(item.path, $event)"
        >
          {{ item.title }}
        </CheckBox>
      </SettingsSection>

      <SettingsSection title="选择工具跳转" variant="sub" />
    </SettingsSection>

    <SettingsSection title="快捷键设置 ?" default-open>
      <EmptyState compact>当前版本未提供快捷键配置，暂无快捷键可设置。</EmptyState>

      <GButton block :loading="copying" @click="copyScripts">手动拷贝配置文件</GButton>
      <GButton type="text" :loading="refreshing" @click="refreshScripts"> 刷新配置文件 </GButton>
    </SettingsSection>

    <SettingsSection title="常用功能面板">
      <EmptyState compact>当前版本未提供常用功能面板配置。</EmptyState>
    </SettingsSection>

    <SettingsSection title="字体面板">
      <!-- 原版是三个按钮开 addcom（`生成/页面规格/08-设置.md:69-76`）：`.btn-small-2` 半宽 -->
      <div class="set-presets">
        <GButton
          v-for="field in PRESET_FIELDS"
          :key="field.key"
          width="half"
          @click="editingPreset = field.key"
        >
          {{ field.label }}
        </GButton>
      </div>
    </SettingsSection>

    <SettingsSection title="云同步设置">
      <p>最新更新：{{ buildTime }}</p>
      <CheckBox v-model="autoSync">开启云同步预设</CheckBox>
    </SettingsSection>

    <!-- 原版是设置页底部一条 `.clear_cache_bar`（`生成/页面规格/08-设置.md:91-98`） -->
    <GButton class="set-clear-cache" block @click="cacheVisible = true">清理缓存</GButton>

    <AddcomDialog
      v-model:visible="presetVisible"
      :title="presetTitle"
      :text="presetText"
      @submit="submitPreset"
    />
    <ClearCacheDialog v-model:visible="cacheVisible" />
  </PageShell>
</template>

<style scoped>
/* 三个「配置字号 / 配置行间距 / 配置字间距」按原版半宽两列排（`.btn-small-2` 宽 calc(50% - 3px)） */
.set-presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.set-clear-cache {
  margin-top: var(--sp-2);
}
</style>
