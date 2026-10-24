<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import CepModal from '@/components/CepModal.vue'
import { useCommand } from '@/components/command/useCommand'
import { useFontSetStore } from '@/stores/font-set'
import { useFontStore } from '@/stores/font'
import { useFeedbackStore } from '@/stores/feedback'
import { useLoadingStore } from '@/stores/loading'
import { useFreePanelAdd } from '@/composables/useFreePanelAdd'
import { refreshTextInfo, refreshTypeUnits, startTextInfoWatch } from '@/selection/current-text'
import { clearMissingFont, FONT_DOWNLOAD_URL, missingFont } from '@/domain/font-missing'
import { FONT_SET_DEFAULTS, type FontSetSettings } from '@/domain/font-set-config'
import { openUrl } from '@/cep/open-url'
import { log } from '@/utils/logger'
import { deepClone } from '@/utils/clone'
import type { FontItem } from '@/cep/types'
import FontColor from './components/FontColor.vue'
import FontHierarchy from './components/FontHierarchy.vue'
import FontQuick from './components/FontQuick.vue'
import CreateButtonPanel from './components/CreateButtonPanel.vue'
import DistributedDialog from './components/DistributedDialog.vue'
import PasteFontPanel from './components/PasteFontPanel.vue'
import SplitPanel from './components/SplitPanel.vue'
import TranslatePanel from './components/TranslatePanel.vue'
import FontSetIcon from './components/FontSetIcon.vue'
import FreePanelRegionPicker from '@/pages/freePanel/components/FreePanelRegionPicker.vue'
import {
  BOTTOM_ICONS_FOUR,
  BOTTOM_ICONS_ONE,
  BOTTOM_ICONS_THREE,
  BOTTOM_ICONS_TWO,
  BOTTOM_TITLES_FOUR,
  BOTTOM_TITLES_ONE,
  BOTTOM_TITLES_THREE,
  BOTTOM_TITLES_TWO,
  TOP_BADGES_ONE,
  TOP_BADGES_TWO,
  TOP_ICONS_ONE,
  TOP_ICONS_TWO,
  TOP_TITLES_ONE,
  TOP_TITLES_TWO,
  UNIT_LABELS,
} from './font-set-constants'

/**
 * 字体面板页（原版 anon_56d7_L34996）。
 *
 * 页面只做三件事：持 UI 态（panel / distribution）、收集配置、调命令。
 * 所有 PS 写入在 `commands/fontSet.ts`；配置从 `stores/font-set` 读。
 */
const store = useFontSetStore()
const fontStore = useFontStore()
const {
  visible: freePanelVisible,
  blocks: freePanelBlocks,
  open: openFreePanelPicker,
  confirm: confirmFreePanel,
} = useFreePanelAdd()
const feedback = useFeedbackStore()

const settings = reactive<FontSetSettings>(deepClone(FONT_SET_DEFAULTS))
const fonts = ref<FontItem[]>([])

const missingFontVisible = computed({
  get: () => missingFont.value !== null,
  set: (visible: boolean) => {
    if (!visible) clearMissingFont()
  },
})

function downloadMissingFont(): void {
  openUrl(FONT_DOWNLOAD_URL)
  clearMissingFont()
}

/** 原版 setFontShow：one0-2 / two0-2，同一时间只开一个 */
const panel = ref<string | null>(null)
const distribution = ref(0)
const distributionTitle = ref('按间距水平分布')

const alignCommand = useCommand('fontSet.align')
const distribute = useCommand('fontSet.distribute')
const split = useCommand('fontSet.split')
const createButton = useCommand('fontSet.createButton')
const copyFont = useCommand('fontSet.copyFont')
const pasteFont = useCommand('fontSet.pasteFont')
const switchDirection = useCommand('fontSet.switchDirection')
const translate = useCommand('fontSet.translate')
const textAlign = useCommand('fontSet.textAlign')
const hierarchySize = useCommand('fontSet.hierarchySize')
const fontSize = useCommand('fontSet.fontSize')
const leading = useCommand('fontSet.leading')
const tracking = useCommand('fontSet.tracking')
const colorCommand = useCommand('fontSet.color')
const fontName = useCommand('fontSet.fontName')
const styleToggle = useCommand('fontSet.styleToggle')
const saveSettings = useCommand('fontSet.saveSettings')
const quickFont = useCommand('fontSet.quickFont')
const hierarchyPreset = useCommand('fontSet.hierarchyPreset')

// ---------- Ctrl+点击加入自由面板 ----------
function openFreePanel(text: string, key: string, option: unknown, icon: string) {
  openFreePanelPicker([{ text, key, option, icon }])
}

function ctrlTopOne(index: number) {
  if (index === 0) {
    openFreePanel('翻译', 'zt_translate', settings.ztTranslate, '#iconfanyi')
    return
  }
  if (index === 2) {
    openFreePanel('生成按钮', 'zt_createButton', settings.ztCreateButton, '#iconanniu')
  }
}

function ctrlTopTwo(index: number) {
  if (index === 0) {
    openFreePanel('复制文本', 'zt_copyFontInfo', null, '#iconfuzhiwenziyangshi')
    return
  }
  if (index === 1) {
    openFreePanel('粘贴文本', 'zt_pasteFontInfo', settings.ztPasteFont, '#iconniantiewenziyangshi')
    return
  }
  openFreePanel('切换文本方向', 'zt_switchFontDirection', null, '#icongenggaiwenbenfangxiang')
}

const unitLabel = computed(() => UNIT_LABELS[store.typeUnits] ?? '点')
/** 模板里不能用 `as`，先在这里定成数组 */
const badgeOne = TOP_BADGES_ONE as readonly number[]
const badgeTwo = TOP_BADGES_TWO as readonly number[]
const currentQuickFont = computed(() => store.quickFonts.list[store.quickFonts.index] ?? null)

let stopTextWatch: (() => void) | null = null
let disposed = false

onMounted(async () => {
  // 原版在 `created` 里先 openPsEvent，再在 `mounted` 里读属性
  // （app.v4.js:42075-42106）。事件注册不能等 store.load，但也不能阻断页面：
  // 注册失败只影响“自动跟随”，页面必须继续加载。
  void startTextInfoWatch()
    .then((stop) => {
      if (disposed) stop()
      else stopTextWatch = stop
    })
    .catch((e) => {
      log.error('fontSet', '文字属性事件订阅失败', e)
      feedback.warn('文字属性事件订阅失败，切换图层不会自动刷新')
    })

  await store.load()
  Object.assign(settings, deepClone(store.settings))
  void refreshTypeUnits()

  void fontStore.loadTags()
  void fontStore.loadStars()

  try {
    fonts.value = await fontStore.fetchList()
  } catch (e) {
    // 字体列表只用于字体面板的下拉；失败不阻塞其它操作，下拉会为空
    fonts.value = []
    log.warn('fontSet', '字体列表读取失败，字体下拉为空', e)
  }
})

onBeforeUnmount(() => {
  disposed = true
  stopTextWatch?.()
  stopTextWatch = null
})

function persist(patch: Partial<FontSetSettings>) {
  Object.assign(settings, patch)
  void saveSettings.run({ patch })
}

function togglePanel(value: string) {
  panel.value = panel.value === value ? null : value
}

function topClickOne(index: number, event?: MouseEvent) {
  if (event?.ctrlKey) return
  if (index === 0) {
    void translate.run(
      {
        from: settings.ztTranslate.from,
        to: settings.ztTranslate.to,
        replace: settings.ztTranslate.delete,
      },
      '翻译完成',
    )
    return
  }
  if (index === 1) {
    togglePanel('one1')
    return
  }
  void createButton.run({ config: settings.ztCreateButton }, '生成按钮完成')
}

function topClickTwo(index: number, event?: MouseEvent) {
  if (event?.ctrlKey) return
  if (index === 0) {
    void copyFont.run(undefined, '复制成功')
    return
  }
  if (index === 1) {
    // 原版：$load.show("正在应用字体设置...") → hide()，没有成功 toast
    void useLoadingStore().run('正在应用字体设置...', () =>
      pasteFont.run({ keeps: settings.ztPasteFont }),
    )
    return
  }
  void switchDirection.run(undefined, '切换成功')
}

function runAlign(axis: 'h' | 'v' | 'bg-h' | 'bg-v', index: number) {
  void alignCommand.run({ axis, index })
}

function bottomClickOne(index: number) {
  // 第 4 个是「水平居中分布」：原版 setLeftRightAlign(3) → zt_setHorizontalCenters
  runAlign('h', index)
}

function bottomClickThree(index: number) {
  runAlign('v', index)
}

function openDistribution(axis: 1 | 2, title: string) {
  distribution.value = axis
  distributionTitle.value = title
}

function bottomClickTwo(index: number) {
  if (index === 0) runAlign('bg-h', 0)
  else openDistribution(1, BOTTOM_TITLES_TWO[1])
}

function bottomClickFour(index: number) {
  if (index === 0) runAlign('bg-v', 0)
  else openDistribution(2, BOTTOM_TITLES_FOUR[1])
}

function onDistribute(value: string) {
  const axis = distribution.value === 1 ? 1 : 2
  void distribute.run({ axis, value })
}

function onSwapLanguages() {
  persist({
    ztTranslate: {
      ...settings.ztTranslate,
      from: settings.ztTranslate.to,
      to: settings.ztTranslate.from,
    },
  })
}

function onSelectPreset(index: number) {
  const preset = store.hierarchy.list[index]
  if (!preset) return
  persist({ ztHierarych: [...preset.data] })
  void hierarchyPreset.run({ action: 'select', index }, '切换成功')
}

function onQuickSelect(index: number) {
  void quickFont.run({ action: 'select', index }, '切换成功')
  void refreshTextInfo()
}

function onQuickApply(weightIndex: number) {
  const font = currentQuickFont.value
  if (!font) return
  void quickFont.run({ action: 'apply', font, weightIndex })
}

function onTranslateUpdate(side: 'from' | 'to', code: string) {
  persist({ ztTranslate: { ...settings.ztTranslate, [side]: code } })
}

function onSavePreset(levels: number[]) {
  persist({ ztHierarych: levels })
  void hierarchyPreset.run({ action: 'save', levels }, '更新成功')
}

function onCreatePreset(name: string, levels: number[]) {
  persist({ ztHierarych: levels })
  void hierarchyPreset.run({ action: 'create', name, levels }, '添加成功')
}

function onRenamePreset(index: number, name: string) {
  void hierarchyPreset.run({ action: 'rename', index, name }, '重命名成功')
}
</script>

<template>
  <div class="fontset">
    <div class="fontset__scroll">
      <!-- ADR-14 扩展二 / T-111：读坏时必须让用户看见。原句来自 store（页面不补结论，ADR-23）；
           首次使用时 store 的 degraded 为空，这里不渲染——"没有"与"坏了"分得开 -->
      <p v-if="store.degraded" class="fontset__degraded">{{ store.degraded }}</p>

      <FontQuick
        :show="settings.ztShowQuick"
        :fonts="store.quickFonts.list"
        :index="store.quickFonts.index"
        @select="onQuickSelect"
        @apply="onQuickApply"
        @add="quickFont.run({ action: 'add' }, '添加字体成功')"
        @remove="quickFont.run({ action: 'delete', index: $event }, '删除成功')"
      />

      <hr class="fontset__line" />

      <FontColor
        :text="store.textInfo"
        :fonts="fonts"
        :defaults="{
          size: settings.ztDefaultSize,
          leading: settings.ztDefaultLeading,
          tracking: settings.ztDefaultTracking,
        }"
        :old-version="settings.ztOldVersion"
        :unit-label="unitLabel"
        :recent-fonts="store.recentFonts"
        :tags="fontStore.tags"
        :stars="fontStore.stars"
        :preview-size="settings.ztPreview"
        @preview="persist({ ztPreview: $event })"
        @font-name="fontName.run($event)"
        @size="fontSize.run({ value: $event })"
        @leading="leading.run({ value: $event })"
        @tracking="tracking.run({ value: $event })"
        @color="colorCommand.run()"
        @style="styleToggle.run($event)"
        @align="textAlign.run($event)"
      />

      <div class="fontset__icons">
        <div class="fontset__icon-row">
          <FontSetIcon
            v-for="(icon, index) in TOP_ICONS_ONE"
            :key="icon"
            :name="icon"
            :title="TOP_TITLES_ONE[index]"
            svg-size="xl"
            :selected="panel === `one${index}`"
            :badge="badgeOne.includes(index)"
            @handle="topClickOne(index, $event)"
            @ctrl="ctrlTopOne(index)"
            @menu="togglePanel(`one${index}`)"
          />
          <span class="fontset__divider" />
          <FontSetIcon
            v-for="(icon, index) in TOP_ICONS_TWO"
            :key="icon"
            :name="icon"
            :title="TOP_TITLES_TWO[index]"
            svg-size="xl"
            :selected="panel === `two${index}`"
            :badge="badgeTwo.includes(index)"
            @handle="topClickTwo(index, $event)"
            @ctrl="ctrlTopTwo(index)"
            @menu="togglePanel(`two${index}`)"
          />
        </div>
      </div>

      <div class="fontset__panels">
        <TranslatePanel
          v-show="panel === 'one0'"
          :from="settings.ztTranslate.from"
          :to="settings.ztTranslate.to"
          :replace="settings.ztTranslate.delete"
          @update="onTranslateUpdate"
          @swap="onSwapLanguages"
          @replace="persist({ ztTranslate: { ...settings.ztTranslate, delete: $event } })"
        />
        <SplitPanel v-show="panel === 'one1'" @split="split.run({ mode: $event })" />
        <CreateButtonPanel
          v-show="panel === 'one2'"
          :config="settings.ztCreateButton"
          @change="persist({ ztCreateButton: { ...settings.ztCreateButton, ...$event } })"
          @apply="createButton.run({ config: settings.ztCreateButton })"
        />
        <PasteFontPanel
          v-show="panel === 'two1'"
          :keeps="settings.ztPasteFont"
          @change="persist({ ztPasteFont: { ...settings.ztPasteFont, ...$event } })"
          @reset="
            persist({
              ztPasteFont: {
                scriptFamily: true,
                color: true,
                opacity: true,
                size: true,
                leading: true,
                tracking: true,
              },
            })
          "
        />
      </div>

      <hr class="fontset__line fontset__line--set" />

      <div class="fontset__icons fontset__icons--bottom">
        <div class="fontset__icon-row">
          <FontSetIcon
            v-for="(icon, index) in BOTTOM_ICONS_ONE"
            :key="icon"
            :name="icon"
            :title="BOTTOM_TITLES_ONE[index]"
            @handle="bottomClickOne(index)"
          />
          <span class="fontset__divider" />
          <FontSetIcon
            v-for="(icon, index) in BOTTOM_ICONS_TWO"
            :key="icon"
            :name="icon"
            :title="BOTTOM_TITLES_TWO[index]"
            @handle="bottomClickTwo(index)"
          />
        </div>
        <div class="fontset__icon-row fontset__icon-row--after">
          <FontSetIcon
            v-for="(icon, index) in BOTTOM_ICONS_THREE"
            :key="icon"
            :name="icon"
            :title="BOTTOM_TITLES_THREE[index]"
            @handle="bottomClickThree(index)"
          />
          <span class="fontset__divider" />
          <FontSetIcon
            v-for="(icon, index) in BOTTOM_ICONS_FOUR"
            :key="icon"
            :name="icon"
            :title="BOTTOM_TITLES_FOUR[index]"
            @handle="bottomClickFour(index)"
          />
        </div>
      </div>

      <hr class="fontset__line" />

      <FontHierarchy
        :show-custom="settings.ztShowCustom"
        :levels="settings.ztHierarych"
        :presets="store.hierarchy.list"
        :preset-index="store.hierarchy.index"
        @apply-level="hierarchySize.run({ value: $event })"
        @update-levels="persist({ ztHierarych: $event })"
        @select-preset="onSelectPreset"
        @save-preset="onSavePreset"
        @create-preset="onCreatePreset"
        @rename-preset="onRenamePreset"
        @delete-preset="hierarchyPreset.run({ action: 'delete', index: $event }, '删除成功')"
      />

      <DistributedDialog
        v-if="distribution > 0"
        :title="distributionTitle"
        :pinned="settings.ztDistributedIsFixed"
        @close="distribution = 0"
        @ok="onDistribute"
        @pin="persist({ ztDistributedIsFixed: $event })"
      />

      <FreePanelRegionPicker
        v-model:visible="freePanelVisible"
        :blocks="freePanelBlocks"
        @confirm="confirmFreePanel"
      />

      <CepModal
        v-model:visible="missingFontVisible"
        title="字体缺失"
        ok-text="前往下载"
        @ok="downloadMissingFont"
      >
        <p>字体「{{ missingFont }}」缺失，点击确定前往下载。</p>
      </CepModal>
    </div>
  </div>
</template>

<style scoped>
.fontset {
  width: 100%;
  max-width: 340px;
  flex: 1;
  min-height: 0;
  height: 100%;
}

/* 左右留白交给各区块自己加：原版是每个 `app-padding` 单独 padding-left，
   统一放在滚动容器上会让"面板背景"也被缩进（原版是全宽） */
.fontset__scroll {
  height: 100%;
  overflow-y: auto;
  padding: 0 0 var(--sp-exact-10);
}

/* ADR-14 扩展二 / T-111：数据降级提示。只在读坏时出现（首次使用不渲染），
   与 fontManage 的 `.data-warning` 同类信息，不抢视觉。左右缩进跟 `.fontset__line` 一致 */
.fontset__degraded {
  margin: 0;
  padding: var(--sp-exact-10) var(--sp-exact-15) 0;
  color: var(--c-warn);
  font-size: var(--fs-sm);
}

/* 原版 hr.line：width:calc(100% - 30px) + padding:0 15px + background-clip:content-box，
   等价于左右各缩进 15px */
.fontset__line {
  width: auto;
  height: 1px;
  /* 原版 hr.line：margin-top:10px / margin-bottom:5px，左右各 15px */
  margin: var(--sp-exact-10) var(--sp-exact-15) var(--sp-exact-5);
  border: 0;
  background: var(--c-divider);
}

.fontset__line--set {
  background: var(--c-sunken);
  margin-bottom: var(--sp-exact-10);
}

.fontset__icons {
  padding: 0 var(--sp-exact-10);
}

.fontset__icons--bottom {
  margin-top: 0;
}

.fontset__icon-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--sp-exact-10);
  margin-bottom: var(--sp-exact-10);
}

.fontset__icon-row--after {
  margin-top: var(--sp-2);
}

/* 原版 `.verline{width:1px;height:13px;background-color:#333;border:none}`（app.bf68b505.css
   @6396），字体面板底排两处都是可见的 `.verline`（app.v4.js:38377 / :38419）。
   与底栏 `.g-bottom-bar__divider`、本页 `.fontset-color__divider` 同一个值。 */
.fontset__divider {
  flex: 0 0 auto;
  width: 1px;
  height: 13px;
  background: var(--c-verline);
}

/* 展开面板的背景要全宽，左右 10px 由面板自己的 padding 提供（原版 .translate-wrap 等） */
.fontset__panels {
  padding: 0;
}
</style>
