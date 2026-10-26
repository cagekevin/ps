<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { useDismiss } from '@/composables/useDismiss'

/**
 * 原版 distributed（app.v4.js:39179）：
 * 按间距分布/对齐的输入弹窗。空值报错；不固定时提交后自动关闭。
 */
const props = withDefaults(defineProps<{ title?: string; pinned?: boolean }>(), {
  title: '水平分布元素',
  pinned: false,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'ok', value: string): void
  (e: 'pin', value: boolean): void
}>()

const value = ref('')
const error = ref('')
const advanced = ref(false)
const inputRef = ref<HTMLInputElement>()
const rootRef = ref<HTMLElement | null>(null)

/**
 * 开关态在父级（`v-if="distribution > 0"`），所以组件**存在即"开着"**。
 * Esc 统一交给 `useDismiss`：若只把 `keydown.esc` 绑在 `<input>` 上，
 * 焦点一离开输入框（Tab 到"高级用法"）就关不掉了。遮罩点击仍是自己的关闭通道（`outside: false`）。
 */
useDismiss(
  () => true,
  rootRef,
  () => cancel(),
  { outside: false },
)

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
})

function cancel() {
  emit('close')
}

function confirm() {
  const text = value.value.trim()
  if (!text) {
    error.value = '不能输入空字符'
    return
  }
  error.value = ''
  emit('ok', text)
  if (!props.pinned) cancel()
}

function onInput() {
  error.value = ''
}

function selectAll(event: FocusEvent) {
  const input = event.target as HTMLInputElement
  if (input.value) setTimeout(() => input.select(), 100)
}
</script>

<template>
  <div ref="rootRef" class="fontset-distributed" @click.stop="cancel">
    <div class="fontset-distributed__main" @click.stop>
      <div class="fontset-distributed__head">
        <span class="fontset-distributed__title">{{ title }}</span>
        <span class="fontset-distributed__spacer" />
        <button
          class="fontset-distributed__pin"
          :class="{ 'is-active': pinned }"
          type="button"
          title="固定弹窗"
          @click="emit('pin', !pinned)"
        >
          <Icon name="#icongudingxuanxiangye" size="sm" />
        </button>
      </div>

      <input
        ref="inputRef"
        v-model="value"
        class="fontset-distributed__input"
        type="text"
        @input="onInput"
        @focus="selectAll"
        @keydown.enter.prevent="confirm"
      />

      <p v-if="error" class="fontset-distributed__error">{{ error }}</p>

      <button class="fontset-distributed__advanced" type="button" @click="advanced = !advanced">
        高级用法
        <Icon name="#iconzhankaizhedie" size="2xs" :class="advanced ? 'is-open' : 'is-closed'" />
      </button>

      <div v-show="advanced" class="fontset-distributed__help">
        <p>固定间距：高度1，高度2，高度3</p>
        <p>如：20,30,40</p>
        <p class="fontset-distributed__help-title">比例间距：高度=比例</p>
        <p>如20=1:2:1</p>
        <p class="fontset-distributed__help-title">递增间距：高度+=比例，如20=5</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fontset-distributed {
  position: fixed;
  inset: 0;
  z-index: var(--z-tooltip);
  background: var(--c-mask-faint);
}

.fontset-distributed__main {
  position: fixed;
  top: 30%;
  left: calc(50vw - 90px);
  width: 180px;
  padding: var(--sp-exact-15) var(--sp-6);
  border: 1px solid var(--c-dialog-border);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
}

.fontset-distributed__head {
  display: flex;
  align-items: center;
}

.fontset-distributed__title {
  color: var(--text-strong);
  font-size: var(--fs-md);
}

.fontset-distributed__spacer {
  flex: 1;
}

.fontset-distributed__pin {
  display: inline-flex;
  padding: var(--sp-1);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
}

.fontset-distributed__pin.is-active {
  background: var(--c-accent-a16);
  color: var(--accent);
}

.fontset-distributed__input {
  width: 100%;
  height: var(--h-control-sm);
  margin-top: var(--sp-exact-15);
  padding: 0 var(--sp-3);
  border: 1px solid var(--c-input);
  border-radius: var(--r-input);
  outline: none;
  background: var(--c-input);
  color: var(--text);
  font-size: var(--fs-md);
}

.fontset-distributed__input:focus {
  border-color: var(--accent-soft);
}

.fontset-distributed__error {
  margin: var(--sp-2) 0 0;
  color: var(--danger);
  font-size: var(--fs-sm);
  line-height: 1em;
}

.fontset-distributed__advanced {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-top: var(--sp-exact-10);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: var(--fs-md);
  cursor: pointer;
}

.fontset-distributed__advanced .is-open {
  transform: rotate(0deg);
}

.fontset-distributed__advanced .is-closed {
  transform: rotate(-90deg);
}

.fontset-distributed__help {
  margin-top: var(--sp-exact-10);
  color: var(--text);
  font-size: var(--fs-md);
  line-height: 16px;
}

.fontset-distributed__help p {
  margin: 0 0 var(--sp-exact-3);
}

.fontset-distributed__help-title {
  margin-top: var(--sp-exact-10);
  font-size: var(--fs-md);
}

.fontset-distributed__help p:last-child {
  margin-top: var(--sp-exact-10);
  margin-bottom: 0;
}
</style>
