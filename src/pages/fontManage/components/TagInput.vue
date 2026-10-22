<script setup lang="ts">
/**
 * 标签名输入框。对应原版 `font-manage__tag__input`（`yk()`，`app.v4.js:48230`）：
 * `<Input>` + 清空图标（v-if 有值）+ 「新建」按钮（v-if），被 creator（`gk()`）
 * 与 linker（`Fk()`）共用一份。
 *
 * `variant` 是**有意偏离**（T-53）：原版只有一套样式，我方 TagCreator 在 CepModal 里
 * 是 30px 带边框（`--c-border-checked`）、TagMenu 在浮层里是 28px 蓝边（`--accent`）。
 * 统一视觉会改 TagCreator 观感，撞「已完成页面冻结」→ 一个组件、两套样式；
 * 行为（回车 / 清空 / 字数上限）只有一份实现。
 */
const model = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    variant?: 'modal' | 'menu'
    placeholder?: string
    maxlength?: number
    /** 原版清空图标是 v-if 有值才出现；TagCreator 那一侧不需要 */
    clearable?: boolean
  }>(),
  { variant: 'menu', placeholder: '标签名称不超过8个字', maxlength: 8, clearable: true },
)

const emit = defineEmits<{ (e: 'enter'): void }>()
</script>

<template>
  <div class="tag-input" :class="`tag-input--${variant}`">
    <input
      v-model="model"
      class="tag-input__field"
      :placeholder="placeholder"
      :maxlength="maxlength"
      @keydown.enter="emit('enter')"
    />
    <button
      v-if="clearable && model"
      class="tag-input__clear"
      type="button"
      aria-label="清空输入"
      @click="model = ''"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
.tag-input {
  position: relative;
  box-sizing: border-box;
}

.tag-input__field {
  width: 100%;
  border-radius: var(--r-md);
  box-sizing: border-box;
  color: var(--c-text-inverse);
}

.tag-input__field::placeholder {
  color: var(--c-text-muted);
}

.tag-input__field:focus {
  outline: none;
}

/* 浮层（TagMenu）：原版 .font-manage__tag__input{margin:8px 0;background:#2c2c2c;
   border-color:#2c2c2c;padding-right:28px;color:#8e8e8e} */
.tag-input--menu {
  margin: var(--sp-4) 0 var(--sp-2);
}

.tag-input--menu .tag-input__field {
  height: var(--h-control);
  padding: 0 var(--sp-6) 0 var(--sp-3);
  border: 1px solid var(--accent);
  background: var(--c-input);
  font-size: var(--fs-sm);
}

/* 弹窗（TagCreator）：沿用本页原来的 30px 带边框输入框，不做视觉迁移 */
.tag-input--modal .tag-input__field {
  height: var(--h-field);
  padding: 0 var(--sp-4);
  border: 1px solid var(--c-border-checked);
  background: var(--c-surface-raised);
  font-size: var(--fs-md);
}

.tag-input--modal .tag-input__field:focus {
  border-color: var(--accent-soft);
}

.tag-input__clear {
  position: absolute;
  right: var(--sp-2);
  top: 50%;
  transform: translateY(-50%);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-lg);
  line-height: 1;
}
</style>
