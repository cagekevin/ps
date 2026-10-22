<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import CheckBox from '@/components/CheckBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import PageShell from '@/components/PageShell.vue'
import SelectBox from '@/components/SelectBox.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import SettingsSection from '@/components/SettingsSection.vue'
import { useCommand } from '@/components/command/useCommand'
import { usePersistedRef } from '@/composables/usePersisted'
import { useCloudStore } from '@/stores/cloud'
import { UNITS } from '@/domain/units'
import { useFontSetStore } from '@/stores/font-set'
import { useNavStore } from '@/stores/nav'

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

const defaultSizes = ref('')
const defaultLeadings = ref('')
const defaultTrackings = ref('')

watch(
  () => fontSet.settings.ztDefaultSize,
  (value) => {
    defaultSizes.value = value.join(',')
  },
  { immediate: true },
)
watch(
  () => fontSet.settings.ztDefaultLeading,
  (value) => {
    defaultLeadings.value = value.join(',')
  },
  { immediate: true },
)
watch(
  () => fontSet.settings.ztDefaultTracking,
  (value) => {
    defaultTrackings.value = value.join(',')
  },
  { immediate: true },
)

function parseNumbers(text: string): number[] {
  return text
    .split(/[,，\s]+/)
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isFinite(value))
}

async function commitFontDefaults(
  key: 'ztDefaultSize' | 'ztDefaultLeading' | 'ztDefaultTracking',
  text: string,
) {
  const values = parseNumbers(text)
  if (!values.length) return
  const previous = [...fontSet.settings[key]]
  fontSet.settings[key] = values
  const ok = await saveFontSettings.run({ patch: { [key]: values } })
  if (!ok) fontSet.settings[key] = previous
}

function commitSizes() {
  void commitFontDefaults('ztDefaultSize', defaultSizes.value)
}

function commitLeadings() {
  void commitFontDefaults('ztDefaultLeading', defaultLeadings.value)
}

function commitTrackings() {
  void commitFontDefaults('ztDefaultTracking', defaultTrackings.value)
}

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
      <GInput
        v-model="defaultSizes"
        placeholder="请输入默认字体大小"
        @blur="commitSizes"
        @enter="commitSizes"
      />
      <GInput
        v-model="defaultLeadings"
        placeholder="请输入默认行间距"
        @blur="commitLeadings"
        @enter="commitLeadings"
      />
      <GInput
        v-model="defaultTrackings"
        placeholder="请输入默认字间距"
        @blur="commitTrackings"
        @enter="commitTrackings"
      />
    </SettingsSection>

    <SettingsSection title="云同步设置">
      <p>最新更新：{{ buildTime }}</p>
      <CheckBox v-model="autoSync">开启云同步预设</CheckBox>
    </SettingsSection>
  </PageShell>
</template>

<style scoped></style>
