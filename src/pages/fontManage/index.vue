<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getFontList } from '@/cep/ps'
import type { FontItem } from '@/cep/types'
import { PREVIEW_LABEL, familyLang, previewText as defaultPreviewText, useFontStore } from '@/stores/font'
import { useFeedbackStore } from '@/stores/feedback'
import { usePagedList } from '@/composables/usePagedList'

import FontWeight from './components/FontWeight.vue'
import Rating from './components/Rating.vue'
import TagMenu from './components/TagMenu.vue'
import EmptyState from './components/EmptyState.vue'
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

const store = useFontStore()
const feedback = useFeedbackStore()
const { tags, tagsError, previewMode, activeFamily, stars, customPreviewText } = storeToRefs(store)

/** 预览文案：用户自定义优先，否则按语言取默认 */
const showTextPanel = ref(false)

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
  void store.toggleTag(text, tagMenu.value.family)
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
    const failure = await store.createTag(value)
    if (failure) {
      feedback.error(failure)
      return
    }
    feedback.ok(`已新建标签「${value}」`)
    return
  }

  if (value === tagCreator.value.from) return
  const failure = await store.renameTag(tagCreator.value.from, value)
  if (failure) {
    feedback.error(failure)
    return
  }
  if (activeTag.value === tagCreator.value.from) activeTag.value = value
  feedback.ok(`已重命名为「${value}」`)
}

async function confirmDelete() {
  const tag = tagDelete.value.tag
  const failure = await store.deleteTag(tag)
  if (failure) {
    feedback.error(failure)
    return
  }
  if (activeTag.value === tag) activeTag.value = ''
  feedback.ok(`已删除标签「${tag}」`)
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

// 双列已移除：面板默认宽度远小于 420，用不上；
// 且 useElementWidth 在窄视口下测量不准（340px 也判成双列），先只保留单列。

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

/**
 * 预览字体栈。用**当前选中字重**的 PostScript 名（原版 font-manage-list 的
 * `postScriptNames[family]` 状态）——选了 Bold，预览就该是 Bold。
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
          <template #suffix>
            <Icon name="iconsousuo" size="sm" />
          </template>
        </GInput>
        <GDropdown v-model:visible="filterOpen" placement="bottom-end">
          <template #trigger>
            <button class="filter-btn" :class="{ 'is-on': langFilter !== 'all' }" type="button">
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
          <button class="tags-add" type="button" title="新建标签" @click="openCreate">+</button>
        </div>
        <p v-if="tagsError" class="tags-error">{{ tagsError }}（标签读取失败，字体列表不受影响）</p>
        <div v-else class="tag-list u-row">
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
      <button v-if="activeTag" class="clear-tag" type="button" @click="activeTag = ''">取消筛选</button>
    </div>

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
        @click="apply(font)"
        @contextmenu="openTagMenu($event, font)"
      >
        <div class="item-body">
          <div class="name-row u-row u-gap-3">
            <span
              class="family"
              :class="{ 'is-name-only': previewMode === 'none' }"
              :style="previewMode === 'none' ? { fontFamily: previewFamily(font) } : undefined"
              >{{ font.family }}</span
            >
            <div class="actions u-row">
              <button
                class="act"
                type="button"
                title="打标签（右键字体行也可以）"
                @click.stop="openTagMenu($event, font)"
              >
                <Icon name="iconbiaoqian" />
              </button>
              <span title="点击收藏，再点一次取消">
                <Rating :selected="stars[font.family] ?? 0" @rating="(value) => store.rate(font.family, value)" />
              </span>
            </div>
          </div>

          <pre
            v-if="previewMode !== 'none'"
            class="preview"
            :class="`is-${previewMode}`"
            :style="{ fontFamily: previewFamily(font) }"
            >{{ sampleText(font) }}</pre
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
      @create="(text) => store.createTag(text)"
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
  </PageShell>
</template>

<style scoped>
/* 和 GInput（--h-control）同排，高度必须一致 */
.icon-btn {
  width: var(--h-control);
  height: var(--h-control);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  color: var(--c-icon);
  font-size: var(--fs-base);
}

/* 搜索框右侧的漏斗按钮（在框外） */
.filter-btn {
  width: var(--h-control);
  height: var(--h-control);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-icon);
}

.filter-btn.is-on {
  color: var(--accent-soft);
}

/* 原版 .tag-input__create{padding:6px 12px;margin:8px 0;background:#3968ff;border-radius:4px;width:fit-content} */
.tag-create {
  margin: var(--sp-4) 0;
  padding: var(--sp-3) var(--sp-5);
  border: 0;
  border-radius: var(--r-md);
  background: var(--c-create);
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  line-height: 16px;
  width: fit-content;
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

/* 左右留白由 PageShell 的工具条统一提供，这里只管上下 */
.search-row {
  padding: var(--sp-4) 0;
}

/* 原版搜索框继承 .base-input：高 30、圆角 5 */
.search-row :deep(.g-input) {
  height: var(--h-field);
  border-radius: var(--r-input);
}

/* 原版底部工具条高 24、底色 #545454 */
:deep(.shell__footer) {
  height: var(--h-footer);
  background: var(--c-bar);
}

.search-row :deep(.g-input) {
  flex: 1;
}

.text-panel {
  padding-bottom: var(--sp-4);
}

.tags {
  padding-bottom: var(--sp-4);
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

/* 标签读不到时要说一句，不能让标签区静默变空 */
.tags-error {
  margin: 0;
  color: var(--danger);
  font-size: var(--fs-sm);
  line-height: 1.5;
}

.tag {
  padding: var(--sp-1) var(--sp-3);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  background: var(--c-surface-raised);
  color: var(--c-text-onchip);
  font-size: var(--fs-md);
  line-height: 16px;
  white-space: nowrap;
}

.tag:hover {
  background: var(--c-surface-raised-hover);
}

.tags-add {
  width: 18px;
  height: 18px;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-icon);
  font-size: var(--fs-xl);
  line-height: 1;
}

.tags-add:hover {
  color: var(--c-text-inverse);
}

.tag:hover {
  border-color: var(--accent-soft);
}

/* 选中：蓝色描边 */
.tag.is-active {
  border-color: var(--accent);
}

/* 原版：全部(259) 单独一行，位于标签和列表之间 */
.list-head {
  flex: 0 0 auto;
  height: var(--h-row);
  padding: 0 var(--page-pad-x);
  border-top: 1px solid var(--border);
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
  white-space: nowrap;
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
  /* 列表项背景要撑满整行（hover 才是全宽），所以左右留白在项内自己给 */
  padding: var(--sp-3) var(--page-pad-x);
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.font-item {
  transition: background var(--dur-fast) var(--ease);
}

.font-item:hover {
  background: var(--c-hover-1);
}

/* 当前应用的字体：白 10% 底 + 左侧 2px 蓝条 */
.font-item.is-active {
  background: var(--c-hover-2);
  box-shadow: inset 2px 0 0 var(--accent);
}

.item-body {
  flex: 1;
  min-width: 0;
}

.name-row {
  height: 15px;
  line-height: 1;
}

/* 原版 __header{height:15px;padding:0 8px}，操作区绝对定位在它里面 */
.name-row {
  position: relative;
  height: 15px;
}

.family {
  flex: 1;
  min-width: 0;
  /* 原版 __font-family 的 max-width: calc(100% - 60px)，给右侧操作区预留位置 */
  max-width: calc(100% - 60px);
  color: var(--c-text);
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

/* 原版 .font-manage__list-item:hover .font-manage__list-item__actions{display:flex}
   家族名用 max-width 预留 60px（原版 __font-family 的 calc(100% - 60px)），
   所以显示时不挤压文字，也不会抖 */
/* 原版 __actions{position:absolute;right:0;top:0;padding:0 8px} —— 绝对定位，不参与 flex 挤压 */
.actions {
  display: none;
  gap: var(--sp-1);
  position: absolute;
  right: 0;
  top: 0;
  padding: 0 var(--sp-4);
}

.font-item:hover .actions,
.font-item.is-active .actions {
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

/* 原版没有给这个图标加背景，只有图标变白（.contextHover:hover .icon{fill:#fff}） */
.act:hover {
  color: var(--c-text-inverse);
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

.del-tip {
  margin: 0;
  color: var(--c-text-strong);
  font-size: var(--fs-md);
  line-height: 1.6;
}
</style>
