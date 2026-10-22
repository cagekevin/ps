<script setup lang="ts">
/** 原面板的 GButton / Button 是同一个东西，这里合成一个 */
withDefaults(
  defineProps<{
    type?: 'default' | 'primary' | 'danger' | 'text'
    size?: 'small' | 'medium'
    disabled?: boolean
    loading?: boolean
    block?: boolean
    /** 动作网格按钮：固定 24px，按列数取宽 */
    grid?: boolean
    columns?: 1 | 2 | 3 | 4
    /**
     * 官方四档宽度（原版 `.btn-1` / `.btn-2` / `.btn-small-4` / `.btn-small-5`）。
     * 这四档属于设计系统，不是页面布局的偶然，所以收在按钮件里，页面不自己算宽度。
     * 依据：`docs/组件库/官方控件.md` O-01；`docs/生成/页面规格/05-常用.md` 的 `btn-small-4/5`。
     */
    width?: 'full' | 'half' | 'quarter' | 'fifth'
    /** 动作网格：拖拽落点 */
    drop?: 'before' | 'after'
    /** 动作网格：hover 显示移除 */
    removable?: boolean
  }>(),
  { type: 'default', size: 'medium', columns: 1 },
)

defineEmits<{ (e: 'click', ev: MouseEvent): void; (e: 'remove', ev: MouseEvent): void }>()
</script>

<template>
  <button
    class="g-btn"
    :class="[
      `g-btn--${type}`,
      `g-btn--${size}`,
      {
        'is-block': block,
        'is-loading': loading,
        'is-grid': grid,
        [`is-grid-${columns}`]: grid,
        [`is-w-${width}`]: Boolean(width),
        'is-drop-before': drop === 'before',
        'is-drop-after': drop === 'after',
      },
    ]"
    :disabled="disabled || loading"
    type="button"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="g-btn__spin" />
    <slot />
    <span v-if="removable" class="g-btn__remove" title="移除" @click.stop="$emit('remove', $event)"
      >×</span
    >
  </button>
</template>

<style scoped>
.g-btn {
  /* 官方档位里的间隙出口：原版按档位差 0.5px，这里给成整档 */
  --g-btn-gap: var(--sp-3);
  --g-btn-gap-half: var(--sp-exact-5);
  /* 原版 4.5px / 4.8px 没有对应 token，取 --sp-3(6px)；
     差值在 1.5px 内，肉眼不可分（依据：docs/生成/页面规格/05-常用.md 的 btn-small-4/5 实测） */
  --g-btn-gap-quarter: var(--sp-3);
  --g-btn-gap-fifth: var(--sp-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  border: 1px solid var(--bg-raise);
  border-radius: var(--r-md);
  background: var(--bg-raise);
  color: var(--text-strong);
  white-space: nowrap;
}

.g-btn--small {
  height: var(--h-control-sm);
  padding: 0 var(--sp-4);
  font-size: var(--fs-md);
}

.g-btn--medium {
  height: var(--h-control);
  padding: 0 var(--sp-5);
  font-size: var(--fs-md);
}

.g-btn:hover:not(:disabled) {
  background: var(--c-surface-raised-hover);
  border-color: var(--c-surface-raised-hover);
}

.g-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--c-text-inverse);
}

.g-btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.g-btn--danger {
  color: var(--danger);
  border-color: var(--c-danger-a16);
}

.g-btn--danger:hover:not(:disabled) {
  background: var(--c-danger-a16);
  border-color: var(--danger);
}

.g-btn--text {
  background: transparent;
  border-color: transparent;
  color: var(--text-dim);
}

.g-btn--text:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}

.g-btn.is-block {
  display: flex;
  width: 100%;
}

/* 官方四档宽度：原版 .btn-1 / .btn-2 / .btn-small-4 / .btn-small-5
   （app.bf68b505.css 实测：calc(100% - 6px) / calc(50% - 5px) /
     calc(25% - 4.5px) / calc(20% - 4.8px)） */
.g-btn.is-w-full {
  width: calc(100% - var(--g-btn-gap));
}

.g-btn.is-w-half {
  width: calc(50% - var(--g-btn-gap-half));
}

.g-btn.is-w-quarter {
  width: calc(25% - var(--g-btn-gap-quarter));
}

.g-btn.is-w-fifth {
  width: calc(20% - var(--g-btn-gap-fifth));
}

/* 动作网格：原版 .btn-min / .btn-* 的 24px 皮肤 */
.g-btn.is-grid {
  height: var(--h-control-sm);
  justify-content: center;
  gap: var(--sp-1);
  padding: 0 var(--sp-exact-5);
  margin: 0 var(--sp-3) var(--sp-exact-5) 0;
  overflow: hidden;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--c-font-btn);
  color: var(--text);
  font-size: var(--fs-md);
  line-height: var(--h-control-sm);
  text-overflow: ellipsis;
}

.g-btn.is-grid:hover:not(:disabled) {
  background: var(--c-font-btn-hover);
}

.g-btn.is-grid-1 {
  width: calc(100% - var(--sp-3));
}

.g-btn.is-grid-2 {
  width: calc(50% - var(--sp-3));
}

.g-btn.is-grid-3 {
  width: calc(33.33333% - var(--sp-3));
}

.g-btn.is-grid-4 {
  width: calc(25% - var(--sp-3));
}

.g-btn.is-drop-before {
  box-shadow: inset 2px 0 0 var(--accent);
}

.g-btn.is-drop-after {
  box-shadow: inset -2px 0 0 var(--accent);
}

.g-btn__remove {
  display: none;
  flex: 0 0 auto;
  color: var(--text-faint);
}

.g-btn.is-grid:hover .g-btn__remove {
  display: inline;
}

.g-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.g-btn__spin {
  width: var(--sp-5);
  height: var(--sp-5);
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: var(--r-pill);
  animation: g-btn-spin 0.7s linear infinite;
}

@keyframes g-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
