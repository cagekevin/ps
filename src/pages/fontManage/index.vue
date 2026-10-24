<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { FontItem } from '@/domain/font-item'
import { PREVIEW_LABEL, previewText as defaultPreviewText, useFontStore } from '@/stores/font'
import { useFeedbackStore } from '@/stores/feedback'
import { usePagedList } from '@/composables/usePagedList'
import { fontListRefresh } from '@/utils/signal'

import FontWeight from './components/FontWeight.vue'
import FontLicense from './components/FontLicense.vue'
import Rating from './components/Rating.vue'
import TagMenu from './components/TagMenu.vue'
import EmptyState from '@/components/EmptyState.vue'
import FilterPanel from './components/FilterPanel.vue'
import { useClassificationStore } from '@/stores/classification-view'
import {
  filterFonts,
  hasActiveFilter,
  usableCategories as usableCategoriesOf,
  type FilterState,
} from '@/domain/font-filter'
import PreviewSetting from './components/PreviewSetting.vue'
import PreviewText from './components/PreviewText.vue'
import TagCreator from './components/TagCreator.vue'
import TagContextMenu from './components/TagContextMenu.vue'
import CepModal from '@/components/CepModal.vue'
import PageShell from '@/components/PageShell.vue'
import GInput from '@/components/GInput.vue'
import GDropdown from '@/components/GDropdown.vue'
import GMenu from '@/components/GMenu.vue'
import GMenuItem from '@/components/GMenuItem.vue'
import Icon from '@/components/Icon.vue'
import { useCommand } from '@/components/command/useCommand'

const store = useFontStore()
const feedback = useFeedbackStore()
const { tags, tagsError, stars, starsError, previewMode, activeFamily, customPreviewText } =
  storeToRefs(store)

// 写操作全部走命令（ADR-16）：页面只拿 boolean，失败由 useCommand 统一提示
const applyFont = useCommand('font.apply')
const rateFont = useCommand('font.rate')
const createTagCmd = useCommand('font.createTag')
const renameTagCmd = useCommand('font.renameTag')
const deleteTagCmd = useCommand('font.deleteTag')
const toggleTagCmd = useCommand('font.toggleTag')
const refreshListCmd = useCommand('font.refreshList')
const importTagsCmd = useCommand('font.importTags')
const exportTagsCmd = useCommand('font.exportTags')

const showTextPanel = ref(false)

/** 预览文案：用户自定义优先，否则按语言取默认 */
function sampleText(font: FontItem) {
  return customPreviewText.value || defaultPreviewText(font.family)
}

/** 右键标签菜单的位置和当前字体 */
const tagMenu = ref({ visible: false, x: 0, y: 0, family: '' })

const activeTagsOf = computed(() => {
  const family = tagMenu.value.family
  if (!family) return []
  return tags.value.filter((tag) => tag.arr.includes(family)).map((tag) => tag.text)
})

function openTagMenu(event: MouseEvent, font: FontItem) {
  event.preventDefault()
  tagMenu.value = { visible: true, x: event.clientX, y: event.clientY, family: font.family }
}

function onTagToggle(text: string) {
  if (!tagMenu.value.family) return
  void toggleTagCmd.run({ tagText: text, family: tagMenu.value.family })
}

/* ---------- 标签的新建 / 重命名 / 删除 ---------- */

const tagCreator = ref({
  visible: false,
  mode: 'create' as 'create' | 'rename',
  from: '',
  initial: '',
})
const tagCtx = ref({ visible: false, x: 0, y: 0, tag: '' })
const tagDelete = ref({ visible: false, tag: '', count: 0 })

function openCreate() {
  tagCreator.value = { visible: true, mode: 'create', from: '', initial: '' }
}

function openTagCtx(event: MouseEvent, tag: string) {
  event.preventDefault()
  tagCtx.value = { visible: true, x: event.clientX, y: event.clientY, tag }
}

function startRename() {
  const tag = tagCtx.value.tag
  tagCtx.value.visible = false
  tagCreator.value = { visible: true, mode: 'rename', from: tag, initial: tag }
}

function askDelete() {
  const tag = tagCtx.value.tag
  const count = tags.value.find((item) => item.text === tag)?.arr.length ?? 0
  tagCtx.value.visible = false
  tagDelete.value = { visible: true, tag, count }
}

async function submitTag(value: string) {
  if (!value) {
    feedback.error('标签名不能为空')
    tagCreator.value.visible = true
    return
  }
  if (tags.value.some((item) => item.text === value && item.text !== tagCreator.value.from)) {
    feedback.error('已有同名标签')
    tagCreator.value.visible = true
    return
  }

  if (tagCreator.value.mode === 'create') {
    await createTagCmd.run({ text: value }, `已新建标签「${value}」`)
    return
  }

  if (value === tagCreator.value.from) return
  const ok = await renameTagCmd.run(
    { from: tagCreator.value.from, to: value },
    `已重命名为「${value}」`,
  )
  if (ok && activeTag.value === tagCreator.value.from) activeTag.value = value
}

async function confirmDelete() {
  const tag = tagDelete.value.tag
  const ok = await deleteTagCmd.run({ text: tag }, `已删除标签「${tag}」`)
  if (ok && activeTag.value === tag) activeTag.value = ''
}

function createTagFromMenu(text: string) {
  void createTagCmd.run({ text }, `已新建标签「${text}」`)
}

const keyword = ref('')
const activeTag = ref('')
/** 筛选面板选中的条件：{ 分类key: [标签id] } */
const filterState = ref<FilterState>({})
const classificationStore = useClassificationStore()
const classification = computed(() => classificationStore.data)
const commercials = computed(() => classification.value.commercials)
/** 分类数据降级提示（ADR-14：不许用假数据冒充真数据） */
const classificationDegraded = computed(() => classificationStore.degraded)
const menuOpen = ref(false)
const filterOpen = ref(false)

let forceRefresh = false
const listRef = ref<HTMLElement>()
const sentinelRef = ref<HTMLElement>()
const { items, visible, loading, error, load, bind } = usePagedList(
  () => store.fetchList({ refresh: forceRefresh }),
  { listRef, sentinelRef },
)

const tagMap = computed(() => new Map(tags.value.map((tag) => [tag.text, tag.arr])))

const filtered = computed(() =>
  filterFonts(items.value, {
    keyword: keyword.value,
    tag: activeTag.value,
    tagFonts: activeTag.value ? tagMap.value.get(activeTag.value) : undefined,
    state: filterState.value,
    data: classification.value,
  }),
)

bind(filtered)

const hasFilter = computed(() =>
  hasActiveFilter({ keyword: keyword.value, tag: activeTag.value, state: filterState.value }),
)

/**
 * 计数：任何筛选生效时显示过滤后的数量，否则显示总数。
 * 三种筛选（标签 / 面板 / 搜索）必须同口径，否则面板筛选后数字不变，看起来像没生效。
 */
const countText = computed(() => {
  const label = activeTag.value || '全部'
  return hasFilter.value ? `${label}(${filtered.value.length})` : `${label}(${items.value.length})`
})

// 单列。原版有双列，但 CEP 面板宽度远小于 420px，用不上。

const filterOn = computed(() => Object.values(filterState.value).some((ids) => ids.length > 0))

/** 筛选按钮角标上的数量（原版 Badge :count） */
const filterCount = computed(() =>
  Object.values(filterState.value).reduce((sum, ids) => sum + ids.length, 0),
)

/** 标签区展开/收起（原版 user-tag-filter 的 chevron_down） */
const TAG_COLLAPSE_HEIGHT = 94
const tagsOpen = ref(true)
const tagsOverflow = ref(false)
const tagListRef = ref<HTMLElement | null>(null)

function measureTags() {
  const el = tagListRef.value
  if (!el) return
  tagsOverflow.value = el.scrollHeight > TAG_COLLAPSE_HEIGHT
  // 标签变少后不再需要折叠，直接展开
  if (!tagsOverflow.value) tagsOpen.value = true
}

watch(
  tags,
  async () => {
    await nextTick()
    measureTags()
  },
  { deep: true },
)

const usableCategories = computed(() => usableCategoriesOf(classification.value))

function clearFilters() {
  keyword.value = ''
  activeTag.value = ''
  filterState.value = {}
}

let offFontRefresh: (() => void) | null = null

let tagResizeObserver: ResizeObserver | null = null

onMounted(() => {
  // 命令层发信号 → 页面自己重取（命令不依赖视图，ADR-16）
  offFontRefresh = fontListRefresh.on(() => {
    void refresh()
  })

  void load()
  void store.loadTags()
  void store.loadStars()
  void classificationStore.load()

  if (typeof ResizeObserver === 'function' && tagListRef.value) {
    tagResizeObserver = new ResizeObserver(() => measureTags())
    tagResizeObserver.observe(tagListRef.value)
  }
})

onBeforeUnmount(() => {
  offFontRefresh?.()
  tagResizeObserver?.disconnect()
})

/**
 * 预览字体栈：用当前选中字重的 PostScript 名，而不是家族名，
 * 否则选了 Bold 预览仍显示 Regular。
 */
function previewFamily(font: FontItem) {
  const index = currentWeight(font.family)
  const ps = font.postScriptNames[index] ?? font.postScriptNames[0] ?? font.family
  return `"${ps}", "${font.family}"`
}

async function refresh() {
  forceRefresh = true
  await load(true)
  forceRefresh = false
}

function onMenuSelect(value: string | number) {
  menuOpen.value = false
  if (value === 'refresh') void refreshListCmd.run()
  else if (value === 'preview') store.cyclePreview()
  else if (value === 'import-tags') openImport()
  else if (value === 'export-tags') openExport()
}

/* ---------- 标签导入 / 导出（T-51，原版 `zg()` 菜单 + `vg()` 确认框）---------- */

// 确认框：原版是 `vg()` 的 CepModal，两条文案按模式切换
const tagIo = ref({ visible: false, mode: 'import' as 'import' | 'export' })

const IMPORT_TIP = '导入标签，会覆盖原来的标签及评分，是否继续？'
const EXPORT_TIP = '导出标签，不包含字体文件，仅导出标签及评分，是否继续？'

function openImport() {
  menuOpen.value = false
  tagIo.value = { visible: true, mode: 'import' }
}

function openExport() {
  menuOpen.value = false
  tagIo.value = { visible: true, mode: 'export' }
}

/**
 * 确认框点了「确定」之后才跑命令。
 *
 * 取消 = 不跑命令 = 不碰任何文件（P0：取消对话框不写盘）。
 * 命令内部还会在**校验通过后、落盘前**再问一次 `onConfirm`，
 * 那道是命令级护栏（测试直接调命令时用它证明"取消不写盘"）。
 */
async function confirmTagIo() {
  const mode = tagIo.value.mode
  if (mode === 'import') {
    const ok = await importTagsCmd.run({ onConfirm: async () => true }, '已导入标签')
    // 导入是覆盖写，标签与评分都要重读
    if (ok) {
      await store.loadTags(true)
      await store.loadStars()
    }
    return
  }
  await exportTagsCmd.run({ onConfirm: async () => true }, '已导出标签')
}

/** 每个家族当前选中的字重下标 */
const weightIndex = ref<Record<string, number>>({})

function currentWeight(family: string) {
  return weightIndex.value[family] ?? 0
}

/**
 * 应用字体。不传字重时用该家族当前选中的字重：
 * 默认 0 会让「选了 Bold 再点这一行」退回 Regular，等于覆盖用户的选择。
 */
function onRate(family: string, value: number) {
  void rateFont.run({ family, value })
}

async function apply(font: FontItem, variantIndex = currentWeight(font.family)) {
  const weight = font.weights[variantIndex] ?? ''
  const ok = await applyFont.run(
    { font, variantIndex },
    `已应用 ${font.family}${weight ? ` · ${weight}` : ''}`,
  )
  if (ok) {
    weightIndex.value[font.family] = variantIndex
    store.activeFamily = font.family
  }
}
</script>

<template>
  <PageShell title="我的字体" class="fm-shell">
    <template #extra>
      <GDropdown v-model:visible="menuOpen" placement="bottom-end">
        <template #trigger>
          <!-- 原版 .font-manage__layouts__tabs__menu__icon{font-size:16px} 是 gdaicon 的
               Icon type:"menu"（三横线）；原版 CSS 里 @font-face 出现 0 次（D-08），
               形状取 sprite 里等价的三横线 icongengduocaidan -->
          <button class="icon-btn" type="button" aria-label="更多操作">
            <Icon name="icongengduocaidan" size="md" />
          </button>
        </template>
        <GMenu @select="onMenuSelect">
          <GMenuItem value="refresh">刷新字体列表</GMenuItem>
          <GMenuItem value="preview">切换预览：{{ PREVIEW_LABEL[previewMode] }}</GMenuItem>
          <!-- 原版这两个入口在 `zg()` 的 font-manager__menu（180px 独立浮层）里，
               触发点是「我的字体」页右上角的另一处图标；我方并进页头已有的 ⋮ 菜单，
               避免为一个新浮层再开一个控件（有意偏离，见台账 T-51） -->
          <GMenuItem value="import-tags">导入标签</GMenuItem>
          <GMenuItem value="export-tags">导出标签</GMenuItem>
        </GMenu>
      </GDropdown>
    </template>

    <template #toolbar>
      <div class="search-row">
        <GInput v-model="keyword" placeholder="搜索" aria-label="搜索字体" clearable>
          <template #suffix>
            <Icon name="iconsousuo" size="sm" />
          </template>
        </GInput>
        <GDropdown v-model:visible="filterOpen" placement="bottom-end" class="filter-dropdown">
          <template #trigger>
            <!-- 原版用 Badge 包 filter 图标，角标 .gda-badge-count：14×14 / #3565ff / top 4 / right 3
                 尺寸与位置见 index.css 的 .filter-badge -->
            <button
              class="filter-btn"
              :class="{ 'is-on': filterOn }"
              type="button"
              aria-label="筛选"
              :aria-expanded="filterOpen"
              :disabled="!usableCategories.length"
            >
              <Icon name="iconguolv" size="lg" />
              <span v-if="filterCount" class="filter-badge">{{ filterCount }}</span>
            </button>
          </template>
          <FilterPanel v-model="filterState" :categories="usableCategories" />
        </GDropdown>
      </div>

      <div v-if="showTextPanel" class="text-panel">
        <PreviewText
          :current="customPreviewText"
          @apply="
            (value) => {
              customPreviewText = value
              showTextPanel = false
            }
          "
        />
      </div>

      <section class="tags">
        <div class="tags-head u-row">
          <span>我的标签</span>
          <div class="tags-tools u-row">
            <button class="tags-add" type="button" aria-label="新建标签" @click="openCreate">
              +
            </button>
            <!-- 原版折叠是文字「更多/收起」+ 容器 max-height:94px；这里用箭头图标代替文字 -->
            <!-- TODO(T-18): 现在只要有一个标签就显示折叠按钮，应改为超过 94px 才出现 -->
            <button
              v-if="tagsOverflow"
              class="tags-toggle"
              :class="{ 'is-open': tagsOpen }"
              type="button"
              aria-label="展开或收起标签"
              :aria-expanded="tagsOpen"
              @click="tagsOpen = !tagsOpen"
            >
              <Icon name="iconxiala" size="sm" />
            </button>
          </div>
        </div>
        <p v-if="tagsError" class="tags-error">{{ tagsError }}（标签读取失败，字体列表不受影响）</p>
        <div
          v-else
          ref="tagListRef"
          class="tag-list u-row"
          :class="{ 'is-collapsed': tagsOverflow && !tagsOpen }"
        >
          <button
            v-for="tag in tags"
            :key="tag.text"
            class="tag"
            :class="{ 'is-active': activeTag === tag.text }"
            type="button"
            @click="activeTag = activeTag === tag.text ? '' : tag.text"
            @contextmenu="openTagCtx($event, tag.text)"
          >
            {{ tag.text }}
          </button>
        </div>
      </section>
    </template>

    <div class="list-head u-row u-gap-2">
      <span class="list-count">{{ countText }}</span>
      <button v-if="activeTag" class="clear-tag" type="button" @click="activeTag = ''">
        取消筛选
      </button>
    </div>

    <p v-if="classificationDegraded" class="data-warning">
      {{ classificationDegraded }}，分类筛选已禁用
    </p>

    <!-- TD-01-4：评分读不到 ≠ 你没收藏过。同一句 data-warning 通道，不加新控件 -->
    <p v-if="starsError" class="data-warning">
      {{ starsError }}：列表里的评分先一律按「未收藏」显示，不是你的评分丢了
    </p>

    <div v-if="error" class="state is-error">
      <p>{{ error }}</p>
      <button class="retry" type="button" @click="refresh">重试</button>
    </div>

    <div v-else-if="loading && !items.length" class="state">正在读取系统字体…</div>

    <div v-else-if="!visible.length" class="state">
      <EmptyState />
      <button v-if="hasFilter" class="retry" type="button" @click="clearFilters">清除筛选</button>
    </div>

    <ul v-else ref="listRef" class="font-list">
      <li
        v-for="font in visible"
        :key="font.family"
        class="font-item u-row"
        :class="{ 'is-active': activeFamily === font.family }"
        tabindex="0"
        :aria-label="`应用字体 ${font.family}`"
        @click="apply(font)"
        @keydown.enter.self.prevent="apply(font)"
        @keydown.space.self.prevent="apply(font)"
        @contextmenu="openTagMenu($event, font)"
      >
        <div class="item-body">
          <div class="name-row u-row u-gap-3">
            <span
              class="family"
              :class="{ 'is-name-only': previewMode === 'none' }"
              :style="{ '--preview-family': previewFamily(font) }"
              >{{ font.family }}</span
            >
            <FontLicense :family="font.family" :commercials="commercials" />
            <div class="actions u-row">
              <button
                class="act"
                type="button"
                aria-label="管理标签"
                @click.stop="openTagMenu($event, font)"
              >
                <Icon name="iconbiaoqian" />
              </button>
              <span>
                <Rating
                  :selected="stars[font.family] ?? 0"
                  @rating="(value) => onRate(font.family, value)"
                />
              </span>
            </div>
          </div>

          <pre
            v-if="previewMode !== 'none'"
            class="preview"
            :class="`is-${previewMode}`"
            :style="{ '--preview-family': previewFamily(font) }"
            >{{ sampleText(font) }}</pre>

          <FontWeight
            :font="font"
            :current="currentWeight(font.family)"
            @select="(index) => apply(font, index)"
          />
        </div>
      </li>
      <li ref="sentinelRef" class="sentinel" aria-hidden="true" />
    </ul>

    <template #footer>
      <PreviewSetting
        :mode="previewMode"
        @update:mode="(value) => (previewMode = value)"
        @toggle-text="showTextPanel = !showTextPanel"
      />
    </template>

    <TagMenu
      v-model:visible="tagMenu.visible"
      :x="tagMenu.x"
      :y="tagMenu.y"
      :tags="tags"
      :active="activeTagsOf"
      @toggle="onTagToggle"
      @create="createTagFromMenu"
    />

    <TagContextMenu
      v-model:visible="tagCtx.visible"
      :x="tagCtx.x"
      :y="tagCtx.y"
      @rename="startRename"
      @remove="askDelete"
    />

    <TagCreator
      v-model:visible="tagCreator.visible"
      :mode="tagCreator.mode"
      :initial="tagCreator.initial"
      @submit="submitTag"
    />

    <CepModal
      v-model:visible="tagDelete.visible"
      title="删除标签"
      :width="280"
      ok-text="删除"
      @ok="confirmDelete"
    >
      <p class="del-tip">
        确定删除标签「{{ tagDelete.tag }}」吗？
        <template v-if="tagDelete.count">
          该标签下有 {{ tagDelete.count }} 个字体，删除后关联会一起消失。
        </template>
      </p>
    </CepModal>

    <!-- 标签导入 / 导出确认框：原版 `vg()`（`app.v4.js:43613-43650`），
         两条文案按模式切换；取消 = 不跑命令 = 不写盘 -->
    <CepModal
      v-model:visible="tagIo.visible"
      :title="tagIo.mode === 'import' ? '导入标签' : '导出标签'"
      :width="280"
      @ok="confirmTagIo"
    >
      <p class="del-tip">
        {{ tagIo.mode === 'import' ? IMPORT_TIP : EXPORT_TIP }}
      </p>
    </CepModal>
  </PageShell>
</template>

<style scoped src="./index.css"></style>
