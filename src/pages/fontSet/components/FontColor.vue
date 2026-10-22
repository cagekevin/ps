<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import FontSetIcon from './FontSetIcon.vue'
import FontSetNumber from './FontSetNumber.vue'
import FontSetSelect from './FontSetSelect.vue'
import type { TextInfo } from '@/selection/current-text'
import type { FontItem } from '@/cep/types'
import { parseNumericText } from '@/utils/number'
import { ALIGN_TIP, ALIGN_TITLES } from '../font-set-constants'

/**
 * 原版 fontSetColor（app.v4.js:40385）：
 * 字体 / 字重 / 颜色 / 加粗 / 倾斜 / 大写 / 对齐 / 字号 / 行距 / 字距。
 *
 * 与源码的差异（有意合并）：原版 `ztExpandMultiple` 为真/假时是两套 DOM，
 * 功能完全重复（见页面规格的两段结构树），这里统一成一套「输入 + 预设」布局；
 * `ztOldVersion` 仍保留原版差异——旧版在样式行显示「视觉」，新版在字距行显示勾选。
 */
const props = defineProps<{
  text: TextInfo | null
  fonts: FontItem[]
  defaults: { size: number[]; leading: number[]; tracking: number[] }
  oldVersion: boolean
  unitLabel: string
  recentFonts?: string[]
  tags?: readonly { text: string; arr: string[] }[]
  stars?: Record<string, number>
  previewSize?: number
}>()

const emit = defineEmits<{
  (
    e: 'fontName',
    value: {
      kind: 'family' | 'weight'
      postScriptName: string
      name: string
      weight: string
      family?: string
    },
  ): void
  (e: 'size', value: number): void
  (e: 'leading', value: number): void
  (e: 'tracking', value: number): void
  (e: 'color'): void
  (e: 'style', value: { kind: 'caps' | 'kerning' | 'italic' | 'bold'; value: boolean }): void
  (e: 'align', value: { index: number; shift: boolean; paragraph: boolean }): void
  (e: 'preview', value: number): void
}>()

const family = ref('')
const familyMode = ref<'all' | 'recent'>('all')
const familyLangMode = ref<'all' | 'cn' | 'en'>('all')
const activeTag = ref('')
const activeStar = ref(0)
const weightIndex = ref(0)
const sizeText = ref('')
const leadingText = ref('')
const trackingText = ref('')
const presetOpen = ref([false, false, false])

const familyNames = computed(() => props.fonts.map((font) => font.family))
const selectedFont = computed(
  () => props.fonts.find((font) => font.family === family.value) ?? null,
)
const weightItems = computed(() => selectedFont.value?.weights ?? [])
const fontIndex = computed(() => familyNames.value.indexOf(family.value))

const colorStyle = computed(() => {
  const rgb = props.text?.color ?? { r: 255, g: 255, b: 255 }
  return { background: `rgb(${rgb.r},${rgb.g},${rgb.b})` }
})

const isOpticalKern = computed({
  get: () => props.text?.autoKerning === 'opticalKern',
  set: (value: boolean) => emit('style', { kind: 'kerning', value }),
})

const toNumber = parseNumericText

watch(
  () => props.text,
  (info) => {
    if (!info) return
    family.value = info.family
    weightIndex.value = Math.max(0, (selectedFont.value?.weights ?? []).indexOf(info.weight))
    sizeText.value = String(toNumber(info.size))
    leadingText.value = info.useAutoLeading ? '(自动)' : String(info.leading)
    trackingText.value = String(info.tracking)
  },
  { immediate: true },
)

watch(selectedFont, (font) => {
  if (!font || !props.text) return
  const index = font.weights.indexOf(props.text.weight)
  weightIndex.value = index < 0 ? 0 : index
})

function applyFamily(index: number) {
  const font = props.fonts[index]
  if (!font) return
  family.value = font.family
  weightIndex.value = 0
  emit('fontName', {
    kind: 'family',
    postScriptName: font.postScriptNames[0] ?? '',
    name: font.names[0] ?? font.family,
    weight: font.weights[0] ?? 'Regular',
    family: font.family,
  })
}

function applyWeight(index: number) {
  const font = selectedFont.value
  if (!font) return
  weightIndex.value = index
  emit('fontName', {
    kind: 'weight',
    postScriptName: font.postScriptNames[index] ?? '',
    name: font.names[index] ?? font.family,
    weight: font.weights[index] ?? 'Regular',
  })
}

function commitSize(value: number) {
  sizeText.value = String(value)
  emit('size', value)
}

function commitLeading(value: number) {
  leadingText.value = String(value)
  emit('leading', value)
}

function commitTracking(value: number) {
  trackingText.value = String(value)
  emit('tracking', value)
}

function togglePreset(index: number) {
  presetOpen.value[index] = !presetOpen.value[index]
}

function pickPreset(value: number, kind: 'size' | 'leading' | 'tracking') {
  // 字号/行距/字距的预设点完保持展开，不自动收起（用户要求）；关闭靠再点箭头 togglePreset
  if (kind === 'size') commitSize(value)
  else if (kind === 'leading') commitLeading(value)
  else commitTracking(value)
}

function onAlign(index: number, event: MouseEvent) {
  emit('align', {
    index,
    shift: event.shiftKey,
    // 原版 ft.f() 只认 ctrlKey（app.v4.js:70622）
    paragraph: event.ctrlKey,
  })
}

/** 旧版布局的快捷档位，逐字对齐 app.v4.js:42295-42297 */
const LEGACY_SIZE = [-1, -2, 1, 2]
const LEGACY_LEADING = [1.1, 1.2, 1.4, 1.6]
const LEGACY_TRACKING = [-25, 0, 25, 100]

function applyLegacySize(delta: number) {
  commitSize(Math.max(1, toNumber(sizeText.value) + delta))
}

/** 原版 setFontLeading(倍率)：行距 = 字号 × 倍率 */
function applyLegacyLeading(factor: number) {
  commitLeading(Math.round(toNumber(sizeText.value) * factor * 100) / 100)
}
</script>

<template>
  <div class="fontset-color">
    <div class="fontset-color__row fontset-color__row--family">
      <FontSetSelect
        class="fontset-color__family"
        :items="familyNames"
        :model-value="fontIndex"
        :display="family || '请选择字体'"
        height="30px"
        filterable
        :recent="recentFonts ?? []"
        :tags="tags"
        :stars="stars"
        :preview-size="previewSize"
        v-model:mode="familyMode"
        v-model:lang="familyLangMode"
        v-model:active-tag="activeTag"
        v-model:active-star="activeStar"
        @update:preview-size="emit('preview', $event)"
        @select="applyFamily"
      />
    </div>

    <div class="fontset-color__row fontset-color__row--after">
      <FontSetSelect
        class="fontset-color__weight"
        :items="weightItems"
        :model-value="weightIndex"
        :display="text?.weight || '选择字重'"
        check
        @select="applyWeight"
      />
      <p class="fontset-color__label" title="颜色">颜色：</p>
      <button
        class="fontset-color__swatch"
        type="button"
        title="设置颜色"
        :style="colorStyle"
        @click="emit('color')"
      />
    </div>

    <div class="fontset-color__row fontset-color__row--after fontset-color__row--style">
      <div
        v-if="oldVersion"
        class="fontset-color__vision"
        :class="{ 'is-active': text?.autoKerning === 'opticalKern' }"
        title="设置两个字符间的字距为视觉"
        @click="isOpticalKern = !isOpticalKern"
      >
        视觉
      </div>

      <FontSetIcon
        name="#iconzihaodaxiao7"
        title="加粗"
        :selected="text?.fauxBold"
        @handle="emit('style', { kind: 'bold', value: !text?.fauxBold })"
      />
      <FontSetIcon
        name="#iconqingxie"
        title="倾斜"
        :selected="text?.fauxItalic"
        @handle="emit('style', { kind: 'italic', value: !text?.fauxItalic })"
      />
      <FontSetIcon
        name="#iconquanbudaxie"
        title="全部大写"
        :selected="text?.capitalization === 'allCaps'"
        @handle="emit('style', { kind: 'caps', value: text?.capitalization !== 'allCaps' })"
      />

      <span class="fontset-color__divider" />

      <FontSetIcon
        v-for="(title, index) in ALIGN_TITLES"
        :key="title"
        :name="`#iconwenbenduiqi${index + 1}`"
        :title="`${title}${ALIGN_TIP}`"
        :selected="
          (text?.justification === 'left' && index === 0) ||
          (text?.justification === 'center' && index === 1) ||
          (text?.justification === 'right' && index === 2)
        "
        @handle="onAlign(index, $event)"
      />
    </div>

    <!-- 原版字号与行距同一行两列（截图 y≈255），不是上下各占一行 -->
    <div class="fontset-color__metric fontset-color__metric--pair">
      <div class="fontset-color__half">
        <FontSetNumber
          v-model="sizeText"
          class="fontset-color__number"
          icon="#iconshezhizitidaxiao"
          icon-size="xl"
          title="设置字体大小"
          :suffix="text ? unitLabel : ''"
          :min="1"
          preset
          @commit="commitSize"
          @preset="togglePreset(0)"
        />
        <div v-if="oldVersion" class="fontset-color__legacy">
          <button
            v-for="delta in LEGACY_SIZE"
            :key="`legacy-size-${delta}`"
            class="fontset-color__legacy-btn"
            type="button"
            @click="applyLegacySize(delta)"
          >
            {{ delta > 0 ? `+${delta}` : delta }}
          </button>
        </div>
      </div>

      <!-- 原版两根输入之间是 30px 的空档（.setNbsp{width:30px}），不是 6px gap -->
      <div class="fontset-color__gutter" />

      <div class="fontset-color__half">
        <FontSetNumber
          v-model="leadingText"
          class="fontset-color__number"
          icon="#iconshezhihangju"
          icon-size="xl"
          title="设置行距"
          :suffix="text ? unitLabel : ''"
          :min="0"
          :step="0.1"
          preset
          @commit="commitLeading"
          @preset="togglePreset(1)"
        />
        <div v-if="oldVersion" class="fontset-color__legacy">
          <button
            v-for="factor in LEGACY_LEADING"
            :key="`legacy-leading-${factor}`"
            class="fontset-color__legacy-btn"
            type="button"
            @click="applyLegacyLeading(factor)"
          >
            {{ factor }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="presetOpen[0]" class="fontset-color__presets">
      <button
        v-for="value in defaults.size"
        :key="`size-${value}`"
        class="fontset-color__preset"
        type="button"
        @click="pickPreset(value, 'size')"
      >
        {{ value }}
      </button>
    </div>

    <div v-if="presetOpen[1]" class="fontset-color__presets">
      <button
        v-for="value in defaults.leading"
        :key="`leading-${value}`"
        class="fontset-color__preset"
        type="button"
        @click="pickPreset(value, 'leading')"
      >
        {{ value }}
      </button>
    </div>

    <!-- 原版字距行右侧是 .setNbsp(30px) + 文字视觉调整，同一行两栏（app.v4.js:41049-41067） -->
    <div class="fontset-color__metric fontset-color__metric--pair">
      <div class="fontset-color__half">
        <FontSetNumber
          v-model="trackingText"
          class="fontset-color__number"
          icon="#iconshezhijianju"
          icon-size="xl"
          title="设置字间距"
          :step="20"
          preset
          @commit="commitTracking"
          @preset="togglePreset(2)"
        />
        <div v-if="oldVersion" class="fontset-color__legacy">
          <button
            v-for="value in LEGACY_TRACKING"
            :key="`legacy-tracking-${value}`"
            class="fontset-color__legacy-btn"
            type="button"
            @click="commitTracking(value)"
          >
            {{ value }}
          </button>
        </div>
      </div>

      <div v-if="!oldVersion" class="fontset-color__gutter" />

      <div v-if="!oldVersion" class="fontset-color__half fontset-color__half--center">
        <CheckBox v-model="isOpticalKern" title="设置两个字符间的字距为视觉">
          文字视觉调整
        </CheckBox>
      </div>
    </div>

    <div v-if="presetOpen[2]" class="fontset-color__presets">
      <button
        v-for="value in defaults.tracking"
        :key="`tracking-${value}`"
        class="fontset-color__preset"
        type="button"
        @click="pickPreset(value, 'tracking')"
      >
        {{ value }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 原版 .app-padding{padding:0 10px} 是加在**每一行**上的；
   预设面板 .fontSpacing 是整宽 + 内部 10px，不跟着行缩进 */
.fontset-color {
  padding: 0;
}

.fontset-color__row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-exact-10);
}

/* 原版样式行是 f-baseX + f-alignNone（justify-content:space-between），
   3 个 T 在左、分隔线 + 3 个对齐在右，均匀铺开 */
.fontset-color__row--style {
  justify-content: space-between;
  gap: 0;
}

.fontset-color__row--family {
  margin-top: var(--sp-exact-10);
}

.fontset-color__row--after {
  margin-top: var(--sp-exact-10);
}

.fontset-color__family {
  flex: 1;
}

.fontset-color__weight {
  flex: 1;
  min-width: 0;
}

.fontset-color__label {
  flex: 0 0 auto;
  margin: 0 0 0 var(--sp-5);
  color: var(--text);
  font-size: var(--fs-md);
}

.fontset-color__swatch {
  flex: 0 0 auto;
  width: 60px;
  height: var(--h-control-sm);
  border: 1px solid var(--c-sunken);
  background: var(--c-color-swatch);
  cursor: pointer;
}

/* 原版 .div-vision{font-size:12px;line-height:19px;height:26px} + .hover{padding:2px;border:1px solid transparent} */
.fontset-color__vision {
  height: 26px;
  padding: 2px;
  border: 1px solid transparent;
  color: var(--text);
  font-size: var(--fs-md);
  line-height: 19px;
  cursor: pointer;
}

/* 原版 div-vision 带 .hover：hover 与选中都是 #222 + #444，文字色不变 */
.fontset-color__vision:hover,
.fontset-color__vision.is-active {
  border-color: var(--c-icon-hover-border);
  background: var(--c-icon-selected);
}

/* 原版 .verline{width:1px;height:13px;background:#333} —— 可见，不是装饰占位 */
.fontset-color__divider {
  width: 1px;
  height: 13px;
  background: var(--c-verline);
}

.fontset-color__metric {
  margin-top: var(--sp-exact-10);
  padding: 0 var(--sp-exact-10);
}

.fontset-color__metric--pair {
  display: flex;
  align-items: flex-start;
}

.fontset-color__half {
  flex: 1;
  min-width: 0;
}

.fontset-color__half--center {
  display: flex;
  height: var(--h-control-sm);
  align-items: center;
}

/* 原版 .setNbsp{width:30px}：两栏之间的固定空档 */
.fontset-color__gutter {
  flex: 0 0 30px;
  width: 30px;
}

.fontset-color__number {
  width: 100%;
  min-width: 0;
}

/* 旧版布局的快捷档位（原版 .old-version-btn） */
.fontset-color__legacy {
  display: flex;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}

/* 原版 .old-version-btn：透明底，hover rgba(0,0,0,.2) */
.fontset-color__legacy-btn {
  width: 25%;
  height: var(--h-control-sm);
  padding: 0;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.fontset-color__legacy-btn:hover {
  background: var(--c-btn-muted);
}

.fontset-color__presets {
  display: flex;
  flex-wrap: wrap;
  /* 原版按钮 .btn-small 是 margin-right:6px / margin-bottom:8px + .mb8 */
  column-gap: var(--sp-3);
  row-gap: var(--sp-4);
  /* 原版 .fontSpacing 带 .theme-mt{margin-top:8px} */
  margin-top: var(--sp-4);
  /* 底部 = fontSpacing 3px + 最后一行按钮 mb8；只写 3px 会贴底 */
  padding: var(--sp-exact-10) var(--sp-exact-10) calc(var(--sp-exact-3) + var(--sp-4));
  background: var(--c-sunken);
}

/* 原版预设是全局 button + .btn-small：背景 #535353、无边框、radius 5、height 26 */
.fontset-color__preset {
  /* 原版 .btn-small-6：6 列 + 5 个 6px gap 正好 100% */
  width: var(--fontset-six-col);
  height: var(--h-row);
  padding: 0;
  border: 0;
  border-radius: var(--r-input);
  background: var(--c-font-btn);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.fontset-color__preset:hover {
  background: var(--c-font-btn-hover);
}
</style>
