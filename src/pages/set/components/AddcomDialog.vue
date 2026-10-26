<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CepModal from '@/components/CepModal.vue'
import GButton from '@/components/GButton.vue'
import { parsePresetText } from '@/domain/font-preset-text'

/**
 * 原版 `addcom`（`docs/生成/页面规格/08-设置.md:293-326`，render `PT()` 62929）：三组预设
 * （字号 / 行距 / 字距）的文本编辑弹窗。
 *
 * 父级 `dropOpen` 把 `addDataVal`（数组）与 `addText`（文本）写进来（`docs/页面/08-设置.md:81`）；
 * 这里收成 `text` 一个 prop —— 打开时两者是同一份快照，分开用在哪未提取。
 *
 * UNVERIFIED（三条，均见 `docs/页面/08-设置.md` 组件表的 ☐ 行）：
 * ① 原版 textarea 还挂了 `@mousewheel`（`生成/页面规格/08-设置.md:303`），语义未提取，本版没接；
 * ② 原版 `.reset` 重置回「`addDataVal` 数组」还是「打开时的文本」未提取，本版按后者；
 * ③ 卡片首行 `<p>` 的标题文案是动态的（同上 :299），本版由父级传当前按钮名。
 *
 * 为什么用 CepModal 而不是自己画 `overprint-add-wrap` 遮罩：外壳归 CepModal（`现有控件.md`）。
 * 「确定」不合法时不留弹窗——`blockClose` 让 `onVisible` 吞掉这一次关闭，
 * CepModal 的 `visible` 是 `defineModel` + 父级 v-model，模型值跟着 prop 走，所以不会自己关掉。
 */
const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    /** 打开时的文本（父级用 `formatPresetText(当前数组)` 给） */
    text?: string
  }>(),
  { title: '配置预设', text: '' },
)

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', values: number[]): void
}>()

const draft = ref(props.text)
const showError = ref(false)
const parsed = computed(() => parsePresetText(draft.value))
const errorMessage = computed(() => (parsed.value.status === 'ok' ? '' : parsed.value.reason))
const blockClose = ref(false)

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    draft.value = props.text
    showError.value = false
    blockClose.value = false
  },
)

/** 确定：不合法就留在弹窗里并把文案显示出来（文案见 `domain/font-preset-text.ts`） */
function onSubmit() {
  if (parsed.value.status !== 'ok') {
    showError.value = true
    blockClose.value = true
    return
  }
  emit('submit', parsed.value.status === 'ok' ? parsed.value.values : [])
}

/** CepModal 的确定 / 取消 / × / 点遮罩最终都走这里 */
function onVisible(value: boolean) {
  if (!value && blockClose.value) {
    blockClose.value = false
    return
  }
  emit('update:visible', value)
}

/** 原版 `.reset`（`生成/页面规格/08-设置.md:311`）：回到打开时的文本 */
function onReset() {
  draft.value = props.text
  showError.value = false
}
</script>

<template>
  <CepModal :visible="visible" :title="title" @update:visible="onVisible" @ok="onSubmit">
    <div class="addcom">
      <textarea v-model="draft" class="addcom__textarea" spellcheck="false" aria-label="预设数值" />
      <!-- 有意偏离：原版 `.reset` 是绝对定位盖在 textarea 右上角（`生成/页面规格/08-设置.md:312`，
           right:30px + margin-top:-30px），这里放成行尾文字按钮，避免浮在输入框上挡住内容 -->
      <GButton class="addcom__reset" type="text" size="small" @click="onReset">重置</GButton>
      <p v-if="showError && parsed.status !== 'ok'" class="addcom__err" role="alert">
        {{ errorMessage }}
      </p>
    </div>
  </CepModal>
</template>

<style scoped>
.addcom {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

/* 原版 .textarea{height:150px;padding:10px;border-radius:5px;font-size:12px}
   （`生成/页面规格/08-设置.md:301`）。宽度原版写死 6px，是它靠父级 `.card` 撑开的写法，
   照抄会得到一条 6px 宽的输入框，故用 100%。底色原版 hsla(0,0%,73.3%,.4) 无对应 token，
   取输入框底色 --c-input；边框原版 #ddd → --c-dialog-border。 */
.addcom__textarea {
  width: 100%;
  height: 150px;
  padding: var(--sp-exact-10);
  border: 1px solid var(--c-dialog-border);
  border-radius: var(--r-input);
  background: var(--c-input);
  color: var(--c-text-inverse);
  font-family: inherit;
  font-size: var(--fs-md);
  line-height: 1.6;
  /* 原版 overflow:overlay，该值已在 Chromium 移除，等价写法是 auto */
  overflow: auto;
  resize: none;
}

.addcom__reset {
  align-self: flex-end;
}

/* 原版 .err{color:red}（同上 :313） */
.addcom__err {
  margin: 0;
  color: var(--c-danger);
  font-size: var(--fs-md);
}
</style>
