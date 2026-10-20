<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { PREVIEW_LABEL, PREVIEW_MODES, type PreviewMode } from '@/stores/font'

/**
 * 底部预览设置。对应原版 font-manage-preview-setting：
 *   工具条上两个图标 —— 眼睛（开档位卡片）、ai（开预览文案输入）
 *   卡片固定在左下角，列出 5 档，选中项打勾
 */
const props = defineProps<{ mode: PreviewMode }>()

const emit = defineEmits<{
  (e: 'update:mode', value: PreviewMode): void
  (e: 'toggle-text'): void
}>()

const open = ref(false)
const cardRef = ref<HTMLElement>()

function pick(mode: PreviewMode) {
  open.value = false
  emit('update:mode', mode)
}

function onDocDown(event: MouseEvent) {
  if (!open.value) return
  if (cardRef.value && !cardRef.value.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onDocDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="ps">
    <button class="ps__icon" type="button" title="预览设置" @click="open = !open">
      <Icon name="iconxianshi" />
    </button>
    <button class="ps__icon" type="button" title="自定义预览文案" @click="emit('toggle-text')">
      <Icon name="iconzihaodaxiao1" />
    </button>

    <Teleport to="body">
      <div v-if="open" ref="cardRef" class="ps__card">
        <div
          v-for="item in PREVIEW_MODES"
          :key="item"
          class="ps__item"
          :class="{ 'is-active': props.mode === item }"
          @click="pick(item)"
        >
          <Icon v-if="props.mode === item" name="icongouxuan" class="ps__check" />
          <span>{{ PREVIEW_LABEL[item] }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ps {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.ps__icon {
  width: 20px;
  height: 20px;
  margin-left: var(--sp-5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-icon);
}

/* 原版 .preview-setting__actions>.gdaicon:hover{background:rgba(0,0,0,.25);border:1px solid hsla(0,0%,100%,.2)} */
.ps__icon:hover {
  background: var(--c-mask-soft);
  border-color: var(--c-border-float-strong);
  border-radius: var(--r-md);
  color: var(--c-text-inverse);
}

.ps__card {
  position: fixed;
  z-index: var(--z-dropdown);
  left: calc(var(--nav-w) + var(--sp-1));
  bottom: var(--sp-6);
  width: 180px;
  padding: var(--sp-5) 0;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
  color: var(--c-text-name);
}

.ps__item {
  position: relative;
  padding: var(--sp-3) 30px;
  font-size: var(--fs-md);
  cursor: pointer;
}

.ps__item:hover,
.ps__item.is-active {
  background: var(--c-accent-solid);
  color: var(--c-text-inverse);
}

.ps__check {
  position: absolute;
  left: var(--sp-5);
  top: 50%;
  transform: translateY(-50%);
}
</style>
