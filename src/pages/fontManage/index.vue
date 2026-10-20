<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getFontList } from '@/cep/ps'
import type { FontItem } from '@/cep/types'
import { PREVIEW_LABEL, familyLang, previewText, useFontStore } from '@/stores/font'
import { useFeedbackStore } from '@/stores/feedback'
import { usePagedList } from '@/composables/usePagedList'
import FontWeight from './components/FontWeight.vue'
import PageShell from '@/components/PageShell.vue'
import GInput from '@/components/GInput.vue'
import GDropdown from '@/components/GDropdown.vue'
import GMenu from '@/components/GMenu.vue'
import GMenuItem from '@/components/GMenuItem.vue'
import Icon from '@/components/Icon.vue'

const store = useFontStore()
const feedback = useFeedbackStore()
const { tags, previewMode, activeFamily } = storeToRefs(store)

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

onMounted(() => {
  void load()
  void store.loadTags()
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
            <Icon name="icongengduocaidan" :size="16" />
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
            <Icon name="iconsousuo" :size="13" />
          </template>
        </GInput>
        <GDropdown v-model:visible="filterOpen" placement="bottom-end">
          <template #trigger>
            <button class="icon-btn" :class="{ 'is-on': langFilter !== 'all' }" type="button">
              <Icon name="iconguolv" :size="15" />
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

    <div v-else-if="!visible.length" class="state">没有匹配的字体</div>

    <ul v-else ref="listRef" class="font-list">
      <li
        v-for="font in visible"
        :key="font.family"
        class="font-item u-row"
        :class="{ 'is-active': activeFamily === font.family }"
        @click="apply(font)"
      >
        <span class="a-mark">A</span>
        <div class="item-body">
          <div class="name-row u-row u-gap-3">
            <span class="family">{{ font.family }}</span>
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
        <Icon :name="previewMode === 'none' ? 'iconyincang' : 'iconxianshi'" :size="15" />
      </button>
      <span class="footer-tip">{{ PREVIEW_LABEL[previewMode] }}</span>
    </template>
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
  color: var(--text-dim);
  font-size: var(--fs-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.sentinel {
  height: 1px;
  list-style: none;
}

.footer-tip {
  color: var(--text-faint);
  font-size: var(--fs-xs);
}
</style>
