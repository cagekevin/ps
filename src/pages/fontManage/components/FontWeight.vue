<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAsciiFamily } from '@/domain/font-lang'
import type { FontItem } from '@/domain/font-item'
import Icon from '@/components/Icon.vue'
import { useDismiss } from '@/composables/useDismiss'

/**
 * 字重选择。对应原版 font-manage-list-font-weight。
 *
 * 关键点：不是一排 "A" 芯片，而是**每个字重渲染成该字体自己的字形**——
 * 英文显示 "A"，中文显示 "永"，这样能直观看出各字重的差别。
 * 最多显示 7 个，第 8 个是数字 chip，点开是带勾选的下拉。
 */
const props = defineProps<{
  font: FontItem
  /** 当前选中的字重下标 */
  current: number
}>()

const emit = defineEmits<{ (e: 'select', index: number): void }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

/**
 * 关闭通道接底座：点外部 + Esc（原来只能"再点一次数字按钮"或"选一项"）。
 * 定位仍是本组件的 CSS `position: absolute` —— 不接 `useFloatingPosition`，
 * 那会改变位置来源（本页是表格行内浮层，跟着行滚），属视觉迁移，冻结节不许。
 */
useDismiss(
  () => open.value,
  root,
  () => {
    open.value = false
  },
)

/** 只有一个字重时不显示这一行（原版逻辑） */
const previews = computed(() =>
  props.font.postScriptNames.length > 1 ? props.font.postScriptNames.slice(0, 7) : [],
)

/**
 * 字重预览用「A」还是「永」——判据委托 `domain/font-lang`。
 * 以前这里自己抄了一份正则：`°` 这类名字在预览里显示「A」，语言筛选却说它是中文。
 */
const glyph = computed(() => (isAsciiFamily(props.font.family) ? 'A' : '永'))

function pick(index: number) {
  open.value = false
  emit('select', index)
}
</script>

<template>
  <div v-if="previews.length" ref="root" class="fw">
    <div class="fw__wrap">
      <div class="fw__list">
        <pre
          v-for="(ps, index) in previews"
          :key="ps"
          class="fw__glyph"
          :class="{ 'is-current': index === current }"
          :style="{ '--glyph-font': `'${ps}', '${font.family}'` }"
          @click.stop="pick(index)"
          >{{ glyph }}</pre>
      </div>
      <button class="fw__count" type="button" @click.stop="open = !open">
        {{ font.weights.length }}
      </button>
    </div>

    <div v-if="open" class="fw__dropdown">
      <div
        v-for="(weight, index) in font.weights"
        :key="weight"
        class="fw__option"
        @click.stop="pick(index)"
      >
        <Icon v-if="index === current" name="icongouxuan" class="fw__check" />
        <span>{{ weight }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fw {
  position: relative;
}

.fw__wrap {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-2) 0 var(--sp-4);
}

.fw__list {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.fw__glyph {
  width: 20px;
  height: 20px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  color: var(--c-text-chip);
  font-family: var(--glyph-font, inherit);
  font-size: var(--fs-base);
  line-height: 1;
  cursor: pointer;
}

.fw__glyph.is-current {
  border-color: var(--c-border-checked);
}

.fw__count {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--bg-raise);
  border-radius: var(--r-md);
  background: var(--bg-raise);
  color: var(--text-dim);
  font-size: var(--fs-sm);
  line-height: 1;
}

.fw__dropdown {
  position: absolute;
  right: 0;
  bottom: 100%;
  z-index: var(--z-dropdown);
  min-width: 120px;
  padding: var(--sp-4) 0 var(--sp-2);
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-input);
  box-shadow: var(--shadow-pop);
}

.fw__option {
  position: relative;
  padding: 0 var(--sp-5) var(--sp-4) 30px;
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  line-height: 17px;
  cursor: pointer;
  white-space: nowrap;
}

.fw__check {
  position: absolute;
  left: var(--sp-5);
  top: var(--sp-1);
}
</style>
