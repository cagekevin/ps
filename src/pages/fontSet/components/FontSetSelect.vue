<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import { familyLang } from '@/stores/font'
import { useDismiss } from '@/composables/useDismiss'

/**
 * 原版 dropDowncom / dropDown 的最小通用形态：
 * 触发器 + 绝对定位列表 + 勾选态 + 行内重命名/删除。
 *
 * 不提到 components/ 的原因：只有字体面板用（AGENTS 第 9 条，等第二页要用再搬）。
 */
const props = withDefaults(
  defineProps<{
    items: readonly string[]
    modelValue?: number
    /** 触发器显示文案；用于"英文"这类不在选项里的默认值（原版结束语言就是这样） */
    display?: string
    placeholder?: string
    check?: boolean
    rename?: boolean
    remove?: boolean
    disabled?: boolean
    maxHeight?: string
    /** 面板顶部加搜索框（原版 squarecom 的字体搜索） */
    filterable?: boolean
    filterPlaceholder?: string
    /** 原版全部/最近切换；不传则不显示 */
    recent?: readonly string[]
    mode?: 'all' | 'recent'
    /** 原版标签筛选；arr 是该标签下的字体家族 */
    tags?: readonly { text: string; arr: string[] }[]
    activeTag?: string
    /** 原版 fontNav：全部 / 中文 / 英文 */
    lang?: 'all' | 'cn' | 'en'
    /** 原版 score：星级筛选，0 表示全部 */
    stars?: Record<string, number>
    activeStar?: number
    /** 原版 ztPreview：0 / 24 / 38 / 50 */
    previewSize?: number
    /**
     * 原版 `baseOpen` 形态：透明、居中、22px 高、9px 展开箭头。
     * fontSetQuick 的字体行用这个，不是深色下拉框。
     */
    plain?: boolean
    /** 触发器高度；原版 base-input normal 30 / small 24 */
    height?: string
  }>(),
  {
    modelValue: -1,
    placeholder: '请选择',
    maxHeight: '220px',
    filterPlaceholder: '搜索字体',
    height: 'var(--h-control-sm)',
    mode: 'all',
  },
)

const emit = defineEmits<{
  (e: 'select', index: number): void
  (e: 'rename', index: number): void
  (e: 'remove', index: number): void
  (e: 'update:mode', value: 'all' | 'recent'): void
  (e: 'update:activeTag', value: string): void
  (e: 'update:lang', value: 'all' | 'cn' | 'en'): void
  (e: 'update:activeStar', value: number): void
  (e: 'update:previewSize', value: number): void
}>()

const open = ref(false)
const keyword = ref('')
const root = ref<HTMLElement>()
const current = computed(() => props.display ?? props.items[props.modelValue] ?? props.placeholder)

/** index 必须指回原数组，否则 check / 删除会错位 */
const entries = computed(() => {
  const all = props.items.map((label, index) => ({ label, index }))
  const base =
    props.mode === 'recent' && props.recent
      ? (() => {
          const order = new Map(props.recent.map((family, index) => [family, index]))
          return all
            .filter((item) => order.has(item.label))
            .sort((a, b) => (order.get(a.label) ?? 0) - (order.get(b.label) ?? 0))
        })()
      : all
  const tagged =
    props.activeTag && props.tags
      ? (() => {
          const tag = props.tags?.find((item) => item.text === props.activeTag)
          if (!tag) return base
          const allowed = new Set(tag.arr)
          return base.filter((item) => allowed.has(item.label))
        })()
      : base
  const localized =
    props.lang && props.lang !== 'all'
      ? tagged.filter((item) => familyLang(item.label) === props.lang)
      : tagged
  const starred = props.activeStar
    ? localized.filter((item) => (props.stars?.[item.label] ?? 0) === props.activeStar)
    : localized
  if (!props.filterable || !keyword.value.trim()) return starred
  const needle = keyword.value.trim().toLowerCase()
  return starred.filter((item) => item.label.toLowerCase().includes(needle))
})

useDismiss(
  () => open.value,
  root,
  () => {
    open.value = false
  },
)

// 每次打开都从空搜索开始，否则上一次的关键词会把列表"锁"住
watch(open, (value) => {
  if (value) keyword.value = ''
})

function choose(index: number) {
  emit('select', index)
  open.value = false
}
</script>

<template>
  <div ref="root" class="fontset-select" :class="{ 'is-disabled': disabled }">
    <button
      class="fontset-select__trigger"
      :class="{ 'fontset-select__trigger--plain': plain }"
      :style="plain ? undefined : { height }"
      type="button"
      :disabled="disabled"
      @click="open = !open"
    >
      <span class="fontset-select__value">{{ current }}</span>
      <Icon
        v-if="plain"
        class="fontset-select__chevron"
        :class="{ 'is-open': open }"
        name="#iconzhankaizhedie"
        size="2xs"
      />
      <Icon v-else name="#iconxiala" size="2xs" />
    </button>

    <div
      v-if="open"
      class="fontset-select__panel"
      :class="{ 'fontset-select__panel--plain': plain }"
      :style="{ maxHeight }"
    >
      <div v-if="recent" class="fontset-select__tabs">
        <button
          type="button"
          :class="{ 'is-active': mode === 'all' }"
          @click="emit('update:mode', 'all')"
        >
          全部
        </button>
        <button
          type="button"
          :class="{ 'is-active': mode === 'recent' }"
          @click="emit('update:mode', 'recent')"
        >
          最近
        </button>
      </div>
      <div v-if="lang" class="fontset-select__tags">
        <button
          type="button"
          :class="{ 'is-active': lang === 'all' }"
          @click="emit('update:lang', 'all')"
        >
          全部
        </button>
        <button
          type="button"
          :class="{ 'is-active': lang === 'cn' }"
          @click="emit('update:lang', 'cn')"
        >
          中文
        </button>
        <button
          type="button"
          :class="{ 'is-active': lang === 'en' }"
          @click="emit('update:lang', 'en')"
        >
          英文
        </button>
      </div>
      <div v-if="previewSize !== undefined" class="fontset-select__tags">
        <button
          v-for="option in [
            { value: 0, label: '普通' },
            { value: 24, label: '小' },
            { value: 38, label: '中' },
            { value: 50, label: '大' },
          ]"
          :key="option.value"
          type="button"
          :class="{ 'is-active': previewSize === option.value }"
          @click="emit('update:previewSize', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div v-if="stars" class="fontset-select__tags">
        <button
          type="button"
          :class="{ 'is-active': !activeStar }"
          @click="emit('update:activeStar', 0)"
        >
          全部
        </button>
        <button
          v-for="value in 3"
          :key="value"
          type="button"
          :class="{ 'is-active': activeStar === value }"
          @click="emit('update:activeStar', value)"
        >
          {{ '★'.repeat(value) }}
        </button>
      </div>
      <div v-if="tags?.length" class="fontset-select__tags">
        <button
          v-for="tag in tags"
          :key="tag.text"
          type="button"
          :class="{ 'is-active': activeTag === tag.text }"
          @click="emit('update:activeTag', activeTag === tag.text ? '' : tag.text)"
        >
          {{ tag.text }}
        </button>
      </div>
      <input
        v-if="filterable"
        v-model="keyword"
        class="fontset-select__search"
        type="text"
        :placeholder="filterPlaceholder"
        @click.stop
      />
      <button
        v-for="entry in entries"
        :key="`${entry.index}-${entry.label}`"
        class="fontset-select__item"
        :class="{ 'is-active': entry.index === modelValue }"
        :style="{ fontSize: previewSize ? `${previewSize}px` : undefined }"
        type="button"
        @click="choose(entry.index)"
      >
        <Icon
          v-if="check"
          class="fontset-select__check"
          :class="{ 'is-hidden': entry.index !== modelValue }"
          name="#icongouxuan"
          size="2xs"
        />
        <span class="fontset-select__label">{{ entry.label }}</span>
        <span v-if="rename || remove" class="fontset-select__actions">
          <span
            v-if="rename"
            class="fontset-select__action"
            title="重命名"
            @click.stop="emit('rename', entry.index)"
          >
            <Icon name="#iconshuru" size="xs" />
          </span>
          <span
            v-if="remove"
            class="fontset-select__action"
            title="删除"
            @click.stop="emit('remove', entry.index)"
          >
            <Icon name="#iconshanchu" size="xs" />
          </span>
        </span>
      </button>
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.fontset-select {
  position: relative;
  min-width: 0;
}

.fontset-select__trigger {
  display: flex;
  width: 100%;
  height: var(--h-control-sm);
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: 0 var(--sp-3);
  /* 原版 .base-dropdown-menu{background:#222;border:1px solid transparent;border-radius:5px} */
  border: 1px solid transparent;
  border-radius: var(--r-input);
  background: var(--c-font-input);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

/* 原版 .base-dropdown-menu:hover 只把文字/箭头变白，不动底色 */
.fontset-select__trigger:hover {
  color: var(--text-strong);
}

/* 原版 baseOpen（.open-more-mian）：height 22、f-center、透明、无内边距 */
.fontset-select__trigger--plain {
  height: 22px;
  justify-content: center;
  gap: var(--sp-4);
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--fs-base);
}

.fontset-select__chevron {
  transform: rotate(-90deg);
  transition: transform var(--dur-fast) var(--ease);
}

.fontset-select__chevron.is-open {
  transform: rotate(0deg);
}

/* 原版 .selectFont-dropDown{width:calc(100% - 20px);left:10px;margin-top:5px} */
.fontset-select__panel--plain {
  left: var(--sp-exact-10);
  width: calc(100% - var(--sp-exact-20));
  margin-top: 5px;
}

.fontset-select.is-disabled .fontset-select__trigger {
  opacity: 0.45;
  cursor: default;
}

.fontset-select__tabs {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
}

.fontset-select__tabs button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-dim);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.fontset-select__tabs button.is-active {
  color: var(--accent);
}

.fontset-select__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1) var(--sp-3);
  padding: 0 var(--sp-3) var(--sp-2);
}

.fontset-select__tags button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-dim);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.fontset-select__tags button.is-active {
  color: var(--accent);
}

.fontset-select__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fontset-select__panel {
  position: absolute;
  left: 0;
  z-index: var(--z-dropdown);
  width: 100%;
  overflow-y: auto;
  margin-top: var(--sp-2);
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}

.fontset-select__search {
  position: sticky;
  top: 0;
  width: 100%;
  height: var(--h-control-sm);
  padding: 0 var(--sp-3);
  border: 0;
  border-bottom: 1px solid var(--c-border-float);
  outline: none;
  background: var(--c-float);
  color: var(--text);
  font-size: var(--fs-md);
}

.fontset-select__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: var(--fs-md);
  text-align: left;
  cursor: pointer;
}

.fontset-select__item:hover,
.fontset-select__item.is-active {
  background: var(--c-hover-2);
  color: var(--text-strong);
}

.fontset-select__check {
  flex: 0 0 auto;
  color: var(--accent);
}

.fontset-select__check.is-hidden {
  visibility: hidden;
}

.fontset-select__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fontset-select__actions {
  display: inline-flex;
  flex: 0 0 auto;
  gap: var(--sp-1);
}

.fontset-select__action {
  display: inline-flex;
  padding: var(--sp-1);
  border-radius: var(--r-sm);
  color: var(--text-dim);
}

.fontset-select__action:hover {
  background: var(--c-hover-2);
  color: var(--text-strong);
}
</style>
