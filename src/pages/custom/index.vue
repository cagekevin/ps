<script setup lang="ts">
import { computed, ref } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import GCollapse from '@/components/GCollapse.vue'
import GInput from '@/components/GInput.vue'
import GSegment from '@/components/GSegment.vue'
import PageShell from '@/components/PageShell.vue'
import { useCommand } from '@/components/command/useCommand'
import { usePersistedRef } from '@/composables/usePersisted'
import { useFeedbackStore } from '@/stores/feedback'
import type { CustomRequest } from '@/domain/custom'
import CustomRow from './components/CustomRow.vue'
import ShapePreview from './components/ShapePreview.vue'
import { ROW_TEXT_MAX, SHAPES, createRow, type CustomRow as Row } from './types'

/**
 * 自定义页（`/custom`）。
 *
 * 结构与顺序对齐原版 render `np()`（`app.v4.js:34774`），
 * 逐条 class 见 `docs/生成/页面规格/04-自定义.md`。
 *
 * 数据流：页面 → useCommand('custom.*') → commands/custom.ts → ctx.jsx.custom.*
 * 界面偏好（形状 / 位置 / 显示高度）→ usePersistedRef → cep/data/settings.ts → sj_v5_ui.json
 * 键沿用原版：`zdyShapeIndex` / `zdyTextLocation` / `zdyShowHeight`（`04-自定义.md:43`）。
 *
 * UNVERIFIED（未提取项，逐条见 `docs/组件库/页面契约.md:300-307`）：
 * - 两个间距输入 / 两个文字大小输入的标签 → 这里用占位符
 * - 两个 `.layout-wrap` 行内的控件 → 这里放文案表里的两条静态说明
 * - 段选选中态样式
 * - 引导图（`.guide-two-Shape`）的图形内容
 */

const feedback = useFeedbackStore()
const generate = useCommand('custom.generate')
const merge = useCommand('custom.mergeRectangles')

// ---------- 界面偏好（原版持久化键） ----------
const shapeIndex = usePersistedRef<number>('zdyShapeIndex', 0)
const textLocation = usePersistedRef<number>('zdyTextLocation', 0)
const showHeight = usePersistedRef<boolean>('zdyShowHeight', false)

// ---------- 行 ----------
const rows = ref<Row[]>([createRow(0)])

function addRow() {
  rows.value = [...rows.value, createRow(rows.value.length)]
}

function removeRow(index: number) {
  if (rows.value.length <= 1) {
    feedback.error('最少保留一行哦')
    return
  }
  rows.value = rows.value.filter((_, i) => i !== index)
}

// ---------- 间距 / 字号 ----------
const rowSpacing = ref('')
const columnSpacing = ref('')
const textSize1 = ref('')
const textSize2 = ref('')

/** 原版空值兜底：间距 `8px`、字号 `0`（`04-自定义.md:126-136`） */
const request = computed<CustomRequest>(() => ({
  shapeIndex: shapeIndex.value,
  textLocation: textLocation.value,
  heightIstrue: showHeight.value,
  rowSpacing: rowSpacing.value.trim() || '8px',
  columnSpacing: columnSpacing.value.trim() || '8px',
  textSize1: textSize1.value.trim() || '0',
  textSize2: textSize2.value.trim() || '0',
  unit: 'px',
  lines: rows.value.map((row) => ({
    tip: row.tip,
    text: row.text,
    height: row.height,
    arr: [row.position],
    allcount: String(row.position + 1),
    pattern: 0,
  })),
}))

/** 前置校验：至少一行有文案；单行不超过 100 字（`04-自定义.md:224-225`） */
function validate(): boolean {
  if (!rows.value.some((row) => row.text.trim())) {
    feedback.error('至少输入一行')
    return false
  }
  if (rows.value.some((row) => row.text.length > ROW_TEXT_MAX)) {
    feedback.error('不要超过100哦')
    return false
  }
  return true
}

async function onGenerate() {
  if (!validate()) return
  await generate.run({ request: request.value }, '正在生成')
}

async function onMerge() {
  if (!validate()) return
  await merge.run({ request: request.value }, '合并矩形')
}

/**
 * 重置参数：只重置 shapeIndex / textLocation / heightIstrue，**不重置 tip**
 * （`04-自定义.md:42`、`:240-255`）。纯 UI 行为，不落命令。
 */
function reset() {
  shapeIndex.value = 0
  textLocation.value = 0
  showHeight.value = false
}
</script>

<template>
  <PageShell>
    <div class="custom">
      <ShapePreview :rows="rows" />

      <div class="custom__shape">
        <GSegment v-model="shapeIndex" :labels="SHAPES" />
      </div>

      <div class="custom__spacings">
        <GInput v-model="rowSpacing" placeholder="行间距" />
        <GInput v-model="columnSpacing" placeholder="列间距" />
      </div>

      <div class="custom__rows">
        <CustomRow
          v-for="(row, index) in rows"
          :key="row.tip"
          :row="row"
          :last="index === rows.length - 1"
          :show-height="showHeight"
          @update:text="rows[index].text = $event"
          @update:position="
            (value) => {
              rows[index].position = value
              textLocation = value
            }
          "
          @update:unit="rows[index].unit = $event"
          @update:height="rows[index].height = $event"
          @remove="removeRow(index)"
        />
        <GButton size="small" @click="addRow">添加一行</GButton>
      </div>

      <div class="custom__sizes">
        <GInput v-model="textSize1" placeholder="文字大小" />
        <GInput v-model="textSize2" placeholder="文字大小" />
      </div>

      <div class="custom__params">
        <p class="custom__param">生成的形状为{{ SHAPES[shapeIndex] }}</p>
        <p class="custom__param">
          默认 px，支持像素(px)、厘米(cm)、毫米(mm)、英尺(in)、点(pt)、派卡(pc)
        </p>
        <CheckBox v-model="showHeight">显示高度</CheckBox>
      </div>

      <GButton
        class="custom__generate"
        block
        type="primary"
        :loading="generate.running.value"
        @click="onGenerate"
      >
        生成框架
      </GButton>

      <div class="custom__buttons">
        <GButton class="custom__button" @click="reset">重置参数</GButton>
        <GButton class="custom__button" @click="onMerge">合并矩形</GButton>
      </div>

      <hr class="custom__line" />

      <GCollapse variant="plain">
        <p class="custom__note">1:2:1表示按比例生成3块</p>
        <p class="custom__note">3=1&gt;2表示生成3块，第1块比例为2，其他为1</p>
        <p class="custom__note">3=1%50表示生成3块，第1块占比50%，其他2个平分50%</p>
      </GCollapse>
    </div>
  </PageShell>
</template>

<style scoped>
/* 原版 .app-main：内容区宽由 MainLayout 给，页面不写 calc(100vw-40px) */
.custom {
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 0 0 0 var(--sp-exact-10);
  overflow-y: auto;
}

.custom__shape {
  padding: 0 0 0 var(--sp-exact-10);
}

/* 原版 .f-baseX.mt15 里两个 .f-space.mr10：左右各占一半 */
.custom__spacings,
.custom__sizes {
  display: flex;
  align-items: center;
  gap: var(--sp-exact-10);
  margin-top: var(--sp-exact-15);
  padding: 0 0 0 var(--sp-exact-10);
}

.custom__spacings > *,
.custom__sizes > * {
  flex: 1 1 0;
  min-width: 0;
}

.custom__rows {
  padding: 0 0 0 var(--sp-exact-10);
}

.custom__params {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-exact-15);
  padding: 0 0 0 var(--sp-exact-10);
}

.custom__param {
  margin: 0;
  color: var(--text-dim);
  font-size: var(--fs-sm);
}

.custom__generate {
  margin-top: var(--sp-exact-12);
}

.custom__buttons {
  display: flex;
  align-items: center;
  gap: var(--sp-exact-10);
  padding: 0 0 0 var(--sp-exact-10);
}

.custom__button {
  flex: 1 1 0;
  min-width: 0;
}

/* 原版 hr.line{width:calc(100% - 30px); margin:5px 0; padding:0 15px} */
.custom__line {
  width: calc(100% - 30px);
  height: 1px;
  margin: var(--sp-exact-5) 0;
  padding: 0 var(--sp-exact-15);
  border: 0;
  background: var(--c-divider);
  background-clip: content-box;
}

.custom__note {
  margin: var(--sp-exact-12) 0 0;
  font-size: var(--fs-sm);
}
</style>
