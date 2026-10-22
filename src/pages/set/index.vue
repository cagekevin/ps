<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
import CloudPullDialog from './components/CloudPullDialog.vue'
import { describeCloudStatus } from './cloud-status'

const cloud = useCloudStore()
const nav = useNavStore()
const fontSet = useFontSetStore()
const { status, queuedUnits } = storeToRefs(cloud)
const autoSyncCmd = useCommand('cloud.setAutoSync')
const downloadCmd = useCommand('cloud.download')
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

/**
 * 云同步三样状态（T-74）：上次同步 / 待推送（队列里等自动同步）/ 冲突（推失败且有分歧）。
 * 数据来源分别是 ledger.syncedAt、队列内存脏集合、`cloud.pending` 里 reason==='conflict' 的条目——
 * 一个数字分不出"未配置"和"冲突"，所以明细由 `cloud-status.ts` 分开措辞。
 */
const cloudView = computed(() =>
  describeCloudStatus({ status: status.value, queuedUnits: queuedUnits.value }),
)

/** 「从云端拉取」（T-78）：确认框先问，确认后走 cloud.download（引擎内串行，不绕过队列） */
const pullVisible = ref(false)
const pulling = computed(() => downloadCmd.running.value)

function confirmPull() {
  // 覆盖本地已在确认框里说清，这里直接放行引擎层的冲突确认，不再二次弹窗
  void downloadCmd.run({ onConfirm: async () => true }, '已从云端拉取').then((ok) => {
    if (ok) cloud.refresh()
  })
}

/** 队列脏数只活在内存里，5 秒刷一次就够；台账（上次同步）不参与，避免每次都读盘 */
let liveTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  cloud.refresh()
  liveTimer = setInterval(() => cloud.refreshLive(), 5000)
  await fontSet.load()
})

onUnmounted(() => {
  if (liveTimer) clearInterval(liveTimer)
  liveTimer = null
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

      <!-- T-74：三样状态分开放，别合并成一个"同步失败" -->
      <SettingsRow>
        <span>上次同步</span>
        <span class="set-cloud__value">{{ cloudView.syncedText }}</span>
      </SettingsRow>
      <SettingsRow>
        <span>待推送</span>
        <span class="set-cloud__value">{{ cloudView.queuedText }}</span>
      </SettingsRow>

      <p v-if="cloudView.failedText" class="set-cloud__fail">
        没同步成功：{{ cloudView.failedText }}
      </p>
      <p v-if="cloudView.conflictText" class="set-cloud__conflict">{{ cloudView.conflictText }}</p>
      <p v-if="cloudView.notice" class="set-cloud__notice">{{ cloudView.notice }}</p>

      <GButton block :loading="pulling" @click="pullVisible = true">从云端拉取</GButton>
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

    <CloudPullDialog
      v-model:visible="pullVisible"
      :synced-text="cloudView.syncedText"
      :queued-units="queuedUnits"
      @ok="confirmPull"
    />
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

/* 云同步状态（T-74）：值靠右、三种提示各用自己的颜色 token */
.set-cloud__value {
  margin-left: auto;
  color: var(--c-text-inverse);
}

.set-cloud__fail {
  margin: 0;
  color: var(--c-warn);
}

.set-cloud__conflict {
  margin: 0;
  color: var(--c-danger);
}

.set-cloud__notice {
  margin: 0;
  color: var(--c-text-faint);
}
</style>
