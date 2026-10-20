<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getFontList } from '@/cep/ps'
import type { FontItem } from '@/cep/types'
import { PREVIEW_LABEL, familyLang, previewText, useFontStore } from '@/stores/font'
import { useFeedbackStore } from '@/stores/feedback'
import { usePagedList } from '@/composables/usePagedList'
import { useElementWidth } from '@/composables/useElementWidth'
import FontWeight from './components/FontWeight.vue'
import Rating from './components/Rating.vue'
import TagMenu from './components/TagMenu.vue'
import EmptyState from './components/EmptyState.vue'
import PageShell from '@/components/PageShell.vue'
import GInput from '@/components/GInput.vue'
import GDropdown from '@/components/GDropdown.vue'
import GMenu from '@/components/GMenu.vue'
import GMenuItem from '@/components/GMenuItem.vue'
import Icon from '@/components/Icon.vue'

const store = useFontStore()
const feedback = useFeedbackStore()
const { tags, previewMode, activeFamily, stars } = storeToRefs(store)

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
  void store.toggleTag(text, tagMenu.value.family)
}

const keyword = ref('')
const activeTag = ref('')
const langFilter = ref<'all' | 'cn' | 'en'>('all')
const menuOpen = ref(false)
const filterOpen = ref(false)

let forceRefresh = false
const listRef = ref<HTMLElement>()
const sentinelRef = ref<HTMLElement>()
const { items, visible, loading, error, load, bind } = usePagedList(
  () => getFontList({ refresh: forceRefresh }),
  { listRef, sentinelRef },
)

const tagMap = computed(() => new Map(tags.value.map((tag) => [tag.text, tag.arr])))

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const tagFonts = activeTag.value ? tagMap.value.get(activeTag.value) : undefined

  return items.value.filter((font) => {
    if (tagFonts && !tagFonts.includes(font.family)) return false
    if (langFilter.value !== 'all' && familyLang(font.family) !== langFilter.value) return false
    if (!kw) return true
    return (
      font.family.toLowerCase().includes(kw) ||
      font.names.some((n) => n.toLowerCase().includes(kw)) ||
      font.postScriptNames.some((n) => n.toLowerCase().includes(kw))
    )
  })
})

bind(filtered)

const countText = computed(() =>
  activeTag.value ? `${activeTag.value}(${filtered.value.length})` : `全部(${items.value.length})`,
)

/** 原版阈值：容器 ≥ 420px 切双列 */
const listWidth = useElementWidth(listRef)
const isDouble = computed(() => listWidth.value >= 420)

const hasFilter = computed(() => !!keyword.value || !!activeTag.value || langFilter.value !== 'all')

function clearFilters() {
  keyword.value = ''
  activeTag.value = ''
  langFilter.value = 'all'
}

onMounted(() => {
  void load()
  void store.loadTags()
  void store.loadStars()
})

function previewFamily(font: FontItem) {
  const ps = font.postScriptNames[0] ?? font.family
  return `"${ps}", "${font.family}"`
}

async function refresh() {
  forceRefresh = true
  await load(true)
  forceRefresh = false
}

function onMenuSelect(value: string | number) {
  menuOpen.value = false
  if (value === 'refresh') void refresh()
  else if (value === 'preview') store.cyclePreview()
}

function onLangSelect(value: string | number) {
  filterOpen.value = false
  langFilter.value = value as 'all' | 'cn' | 'en'
}

/** 每个家族当前选中的字重下标 */
const weightIndex = ref<Record<string, number>>({})

function currentWeight(family: string) {
  return weightIndex.value[family] ?? 0
}

async function apply(font: FontItem, variantIndex = 0) {
  const failure = await store.apply(font, variantIndex)
  if (failure) {
    feedback.error(failure)
    return
  }
  weightIndex.value[font.family] = variantIndex
  const weight = font.weights[variantIndex] ?? ''
  feedback.ok(`已应用 ${font.family}${weight ? ` · ${weight}` : ''}`)
}
</script>

<template>
  <PageShell title="我的字体">
    <template #extra>
      <GDropdown v-model:visible="menuOpen" placement="bottom-end">
        <template #trigger>
          <button class="icon-btn" type="button">
            <Icon name="icongengduocaidan" size="md" />
          </button>
        </template>
        <GMenu @select="onMenuSelect">
          <GMenuItem value="refresh">刷新字体列表</GMenuItem>
          <GMenuItem value="preview">切换预览：{{ PREVIEW_LABEL[previewMode] }}</GMenuItem>
        </GMenu>
      </GDropdown>
    </template>

    <template #toolbar>
      <div class="search-row u-row u-gap-2">
        <GInput v-model="keyword" placeholder="搜索" clearable>
          <template #prefix>
            <Icon name="iconsousuo" size="sm" />
          </template>
        </GInput>
        <GDropdown v-model:visible="filterOpen" placement="bottom-end">
          <template #trigger>
            <button class="icon-btn" :class="{ 'is-on': langFilter !== 'all' }" type="button">
              <Icon name="iconguolv" size="lg" />
            </button>
          </template>
          <GMenu :model-value="langFilter" @select="onLangSelect">
            <GMenuItem value="all">全部语言</GMenuItem>
            <GMenuItem value="cn">中文</GMenuItem>
            <GMenuItem value="en">英文</GMenuItem>
          </GMenu>
        </GDropdown>
      </div>

      <section class="tags">
        <div class="tags-head u-row">
          <span>我的标签</span>
          <button class="icon-btn is-plain" disabled type="button">+</button>
        </div>
        <div class="tag-list u-row">
          <button
            v-for="tag in tags"
            :key="tag.text"
            class="tag"
            :class="{ 'is-active': activeTag === tag.text }"
            type="button"
            @click="activeTag = activeTag === tag.text ? '' : tag.text"
          >
            {{ tag.text }}
          </button>
        </div>
      </section>

      <div class="list-head u-row u-gap-2">
        <span class="a-mark">A</span>
        <span class="list-count">{{ countText }}</span>
        <button v-if="activeTag" class="clear-tag" type="button" @click="activeTag = ''">取消筛选</button>
      </div>
    </template>

    <div v-if="error" class="state is-error">
      <p>{{ error }}</p>
      <button class="retry" type="button" @click="refresh">重试</button>
    </div>

    <div v-else-if="loading && !items.length" class="state">正在读取系统字体…</div>

    <div v-else-if="!visible.length" class="state">
      <EmptyState />
      <button v-if="hasFilter" class="retry" type="button" @click="clearFilters">清除筛选</button>
    </div>

    <ul v-else ref="listRef" class="font-list" :class="{ 'is-double': isDouble }">
      <li
        v-for="font in visible"
        :key="font.family"
        class="font-item u-row"
        :class="{ 'is-active': activeFamily === font.family }"
        @click="apply(font)"
        @contextmenu="openTagMenu($event, font)"
      >
        <span class="a-mark">A</span>
        <div class="item-body">
          <div class="name-row u-row u-gap-3">
            <span
              class="family"
              :class="{ 'is-name-only': previewMode === 'none' }"
              :style="previewMode === 'none' ? { fontFamily: previewFamily(font) } : undefined"
              >{{ font.family }}</span
            >
            <div class="actions u-row">
              <button class="act" type="button" @click.stop="openTagMenu($event, font)">
                <Icon name="iconbiaoqian" />
              </button>
              <Rating :selected="stars[font.family] ?? 0" @rating="(value) => store.rate(font.family, value)" />
            </div>
          </div>

          <pre
            v-if="previewMode !== 'none'"
            class="preview"
            :class="`is-${previewMode}`"
            :style="{ fontFamily: previewFamily(font) }"
            >{{ previewText(font.family) }}</pre
          >

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
      <button class="icon-btn" type="button" @click="store.cyclePreview()">
        <Icon :name="previewMode === 'none' ? 'iconyincang' : 'iconxianshi'" size="sm" />
      </button>
      <span class="footer-tip">{{ PREVIEW_LABEL[previewMode] }}</span>
    </template>

    <TagMenu
      v-model:visible="tagMenu.visible"
      :x="tagMenu.x"
      :y="tagMenu.y"
      :tags="tags"
      :active="activeTagsOf"
      @toggle="onTagToggle"
    />
  </PageShell>
</template>

<style scoped>
.icon-btn {
  width: var(--h-control-sm);
  height: var(--h-control-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  color: var(--c-icon);
  font-size: var(--fs-base);
}

.icon-btn:hover:not(:disabled) {
  background: var(--bg-raise);
  color: var(--c-text-inverse);
}

.icon-btn.is-on {
  color: var(--accent-soft);
}

.icon-btn.is-plain {
  font-size: var(--fs-xl);
  line-height: 1;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.search-row {
  padding: var(--sp-4);
}

.search-row :deep(.g-input) {
  flex: 1;
}

.tags {
  padding: 0 var(--sp-4) var(--sp-4);
}

.tags-head {
  height: 22px;
  color: var(--text-dim);
  font-size: var(--fs-md);
}

.tags-head span {
  flex: 1;
}

.tag-list {
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.tag {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--bg-raise);
  border-radius: var(--r-md);
  background: var(--bg-raise);
  color: var(--c-text-onchip);
  font-size: var(--fs-md);
  line-height: 16px;
}

.tag:hover {
  border-color: var(--accent-soft);
}

.tag.is-active {
  border-color: var(--accent-soft);
  color: var(--c-text-inverse);
}

.list-head {
  height: var(--h-row);
  padding: 0 var(--sp-4);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  color: var(--c-text-muted);
  font-size: var(--fs-md);
}

.list-count {
  flex: 1;
  font-weight: 500;
}

.clear-tag {
  border: 0;
  background: transparent;
  color: var(--accent-soft);
  font-size: var(--fs-sm);
}

.a-mark {
  flex: 0 0 auto;
  width: 12px;
  color: var(--c-icon-strong);
  font-family: Georgia, "Times New Roman", serif;
  font-size: var(--fs-md);
  text-align: center;
}

.state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: var(--sp-7);
  color: var(--text-faint);
  font-size: var(--fs-md);
  text-align: center;
}

.state.is-error {
  color: var(--danger);
}

.state p {
  margin: 0;
  word-break: break-all;
}

.retry {
  height: var(--h-control-sm);
  padding: 0 var(--sp-5);
  border: 1px solid var(--bg-raise);
  border-radius: var(--r-md);
  background: var(--bg-raise);
  color: var(--text-strong);
  font-size: var(--fs-md);
}

.font-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}

.font-item {
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4) var(--sp-3) 0;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.font-item:hover {
  background: var(--bg-active);
}

.font-item.is-active {
  background: var(--bg-active);
}

.item-body {
  flex: 1;
  min-width: 0;
}

.name-row {
  height: 15px;
  line-height: 1;
}

.family {
  flex: 1;
  min-width: 0;
  color: var(--c-text-strong);
  font-size: var(--fs-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 无预览模式：家族名用字体本身渲染，字号放大（原版 __name--no-preview） */
.family.is-name-only {
  color: var(--c-text-name);
  font-size: var(--fs-name);
  line-height: var(--fs-name-lh);
  font-weight: 400;
  padding-bottom: var(--sp-6);
}

/* hover 才出现的操作区：打标签 + 星级 */
.actions {
  display: none;
  gap: var(--sp-1);
}

.font-item:hover .actions {
  display: flex;
}

.act {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-icon);
}

.act:hover {
  background: var(--bg-raise);
  color: var(--text-strong);
}

.preview {
  margin: 0;
  padding: var(--sp-3) 0;
  color: var(--c-text-preview);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview.is-small {
  font-size: var(--preview-sm);
  line-height: var(--preview-sm-lh);
}

.preview.is-medium {
  font-size: var(--preview-md);
  line-height: var(--preview-md-lh);
}

.preview.is-large {
  font-size: var(--preview-lg);
  line-height: var(--preview-lg-lh);
}

.preview.is-extra-large {
  font-size: var(--preview-xl);
  line-height: var(--preview-xl-lh);
}

/* 面板拉宽到 420px 以上切双列（原版 font-manage__list--double-cols） */
.font-list.is-double {
  display: grid;
  grid-template-columns: 50% 50%;
}

.font-list.is-double .font-item {
  min-width: 0;
}

.font-list.is-double .sentinel {
  grid-column: 1 / -1;
}

.sentinel {
  height: 1px;
  list-style: none;
}

.footer-tip {
  color: var(--text-faint);
  font-size: var(--fs-xs);
}
</style>
