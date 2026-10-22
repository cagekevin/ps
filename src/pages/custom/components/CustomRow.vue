<script setup lang="ts">
import { ref } from 'vue'
import GInput from '@/components/GInput.vue'
import Icon from '@/components/Icon.vue'
import SelectBox from '@/components/SelectBox.vue'
import { UNITS } from '@/domain/units'
import type { CustomRow } from '../types'
import PositionGrid from './PositionGrid.vue'

/**
 * 一行（原版 `v-for` 展开的那一行）。
 *
 * 结构（`docs/生成/页面规格/04-自定义.md`）：
 * - `baseInput.inputcom-1.theme-mr` + 后缀 `baseSvg.ml9`（展开该行的位置九宫格）
 * - `div.f-baseX` v-show（位置九宫格展开时显示）
 * - `baseIcon.guide-two-Shape` v-if（引导图；图形内容未提取）
 * - `baseInput.hiddenInput` v-else（75px 宽的单位选择 + `baseIcon.ml4`）
 *
 * UNVERIFIED: 引导图（`.guide-two-Shape`）的图形内容未提取，这里用一个占位图标表示，
 * 触发后切换到单位选择。单位选项来源未提取，用设置页同源的 `UNITS`（`docs/页面/04-自定义.md:32`）。
 */
const props = defineProps<{
  row: CustomRow
  /** 是否是最后一行；最后一行没有删除按钮 */
  last: boolean
  /**
   * 是否显示高度（`zdyShowHeight`）。
   * 原版这一行是 v-if / v-else 二选一：开了显示高度给引导图，否则给单位选择
   * （`docs/生成/页面规格/04-自定义.md` 的 `baseIcon.guide-two-Shape` v-if /
   * `baseInput.hiddenInput` v-else）。
   */
  showHeight?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:text', value: string): void
  (e: 'update:position', value: number): void
  (e: 'update:unit', value: string): void
  (e: 'update:height', value: string): void
  (e: 'remove'): void
}>()

/** 位置九宫格是否展开（原版靠点后缀图标切换） */
const expanded = ref(false)

const unitIndex = ref(
  Math.max(
    0,
    UNITS.findIndex((item) => item.value === props.row.unit),
  ),
)

function onUnitPick(index: number) {
  const unit = UNITS[index]
  if (!unit) return
  unitIndex.value = index
  emit('update:unit', unit.value)
}
</script>

<template>
  <div class="custom-row">
    <div class="custom-row__head">
      <GInput
        class="custom-row__input"
        :model-value="row.text"
        :placeholder="row.tip"
        @update:model-value="emit('update:text', $event)"
      >
        <template #suffix>
          <button
            class="custom-row__toggle"
            type="button"
            title="展开位置"
            @click="expanded = !expanded"
          >
            <Icon name="iconwenanweizhi1" size="xs" />
          </button>
        </template>
      </GInput>

      <button
        v-if="!last"
        class="custom-row__remove"
        type="button"
        title="删除本行"
        @click="emit('remove')"
      >
        <Icon name="iconshanchu" size="xs" />
      </button>
    </div>

    <div v-show="expanded" class="custom-row__positions">
      <PositionGrid
        :model-value="row.position"
        @update:model-value="emit('update:position', $event)"
      />
    </div>

    <div class="custom-row__unit">
      <!-- 原版 v-if / v-else：开显示高度给引导图，否则给单位选择 -->
      <button v-if="showHeight" class="custom-row__guide" type="button" title="高度引导">
        <Icon name="iconzhankaishouqi" size="sm" />
      </button>
      <SelectBox
        v-else
        class="custom-row__unit-select"
        :model-value="unitIndex"
        :options="UNITS"
        @choose="onUnitPick"
      />
    </div>

    <GInput
      v-if="showHeight"
      class="custom-row__height"
      :model-value="row.height"
      placeholder="高度"
      @update:model-value="emit('update:height', $event)"
    />
  </div>
</template>

<style scoped>
.custom-row {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-top: var(--sp-exact-10);
}

.custom-row__head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

/* 原版 .inputcom-1{flex-grow:1; margin-right:10px} */
.custom-row__input {
  flex: 1 1 0;
  min-width: 0;
  margin-right: var(--sp-exact-10);
}

.custom-row__toggle,
.custom-row__guide,
.custom-row__remove {
  display: inline-flex;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-custom-svg);
  cursor: pointer;
}

.custom-row__remove {
  color: var(--text-faint);
}

.custom-row__positions {
  display: flex;
  align-items: center;
}

/* 原版 .hiddenInput{width:75px} */
.custom-row__unit-select {
  width: 75px;
}

.custom-row__height {
  width: 100%;
}
</style>
