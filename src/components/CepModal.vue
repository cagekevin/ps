<script setup lang="ts">
/**
 * 弹窗，对应原面板的 $msg（showErr / showErrHtml）。
 * toast 放不下详情的时候用它：批量失败汇总、需要用户确认的危险操作。
 */
const props = withDefaults(
  defineProps<{
    title?: string
    width?: number
    okText?: string
    cancelText?: string
    hideCancel?: boolean
  }>(),
  { title: '提示', width: 260, okText: '确定', cancelText: '取消', hideCancel: false },
)

const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ (e: 'ok'): void; (e: 'cancel'): void }>()

function onOk() {
  emit('ok')
  visible.value = false
}

function onCancel() {
  emit('cancel')
  visible.value = false
}
</script>

<template>
  <Teleport to="body">
    <transition name="scale">
      <div v-if="visible" class="modal-mask" @click.self="onCancel">
        <div class="modal" :style="{ width: `${props.width}px` }">
          <header class="modal__header">
            <span class="modal__title">{{ title }}</span>
            <button class="modal__close" type="button" @click="onCancel">×</button>
          </header>
          <div class="modal__body">
            <slot />
          </div>
          <footer class="modal__footer">
            <button v-if="!hideCancel" class="modal__btn" type="button" @click="onCancel">
              {{ cancelText }}
            </button>
            <button class="modal__btn is-primary" type="button" @click="onOk">{{ okText }}</button>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-mask);
}

.modal {
  max-width: calc(100vw - var(--sp-7));
  max-height: calc(100vh - var(--sp-7));
  display: flex;
  flex-direction: column;
  border: 1px solid var(--bg-raise);
  border-radius: var(--modal-radius, var(--r-md));
  background: var(--c-float);
  box-shadow: var(--shadow-float);
  color: var(--text-strong);
}

.modal__header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 var(--sp-4) 0 var(--sp-5);
  border-bottom: 1px solid var(--c-border-float);
}

.modal__title {
  flex: 1;
  font-size: var(--fs-lg);
  font-weight: 500;
}

.modal__close {
  width: var(--h-control-sm);
  height: var(--h-control-sm);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-dim);
  font-size: var(--fs-xl);
  line-height: 1;
}

.modal__close:hover {
  background: var(--bg-raise);
  color: var(--c-text-inverse);
}

.modal__body {
  flex: 1;
  min-height: 0;
  padding: var(--modal-body-padding, var(--sp-5));
  overflow-y: auto;
  color: var(--text);
  font-size: var(--fs-md);
  line-height: 1.7;
  word-break: break-word;
}

.modal__footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5) var(--sp-5);
}

.modal__btn {
  height: var(--h-row);
  padding: 0 var(--sp-5);
  border: 1px solid var(--bg-raise);
  border-radius: var(--r-md);
  background: var(--bg-raise);
  color: var(--text-strong);
  font-size: var(--fs-md);
}

.modal__btn:hover {
  background: var(--c-surface-raised-hover);
}

.modal__btn.is-primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--c-text-inverse);
}

.modal__btn.is-primary:hover {
  background: var(--accent-hover);
}

/* 过渡用 styles/motion.css 里的 .scale，不在这里重复定义 */
</style>
