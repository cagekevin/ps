<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'

/**
 * 自定义预览文案。对应原版 font-manage-preview-text：
 *   左侧字号图标 + 输入框（占位「请输入预览文案」）+「应用」按钮
 *   输入为空时按钮置灰；回车等同点应用
 */
const props = defineProps<{ current: string }>()

const emit = defineEmits<{ (e: 'apply', value: string): void }>()

const text = ref(props.current)

watch(
  () => props.current,
  (value) => {
    text.value = value
  },
)

function apply() {
  emit('apply', text.value.trim())
}
</script>

<template>
  <div class="pt">
    <Icon name="iconzihaodaxiao1" size="xl" class="pt__icon" />
    <input
      v-model="text"
      class="pt__input"
      placeholder="请输入预览文案"
      @keydown.enter="apply"
    />
    <button class="pt__btn" :class="{ 'is-disabled': !text }" :disabled="!text" type="button" @click="apply">
      应用
    </button>
  </div>
</template>

<style scoped>
.pt {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  position: relative;
  margin-bottom: var(--sp-exact-3);
}

.pt__icon {
  position: absolute;
  z-index: var(--z-base);
  left: var(--sp-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-icon);
}

.pt__input {
  flex: 1;
  height: var(--h-field);
  padding-left: 28px;
  border: 1px solid var(--c-border-checked);
  border-radius: var(--r-md);
  background: var(--c-surface-raised);
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
}

.pt__input::placeholder {
  color: var(--c-text-muted);
}

.pt__input:hover,
.pt__input:focus {
  border-color: var(--accent-soft);
  outline: none;
}

.pt__btn {
  margin-left: var(--sp-1);
  height: var(--h-field);
  padding: 0 var(--sp-5);
  border: 1px solid var(--c-surface-raised);
  border-radius: var(--r-md);
  background: var(--c-surface-raised);
  color: var(--c-text-strong);
  font-size: var(--fs-md);
}

.pt__btn.is-disabled,
.pt__btn.is-disabled:hover {
  background: var(--c-disabled-bg);
  color: var(--c-disabled-text);
  cursor: default;
}
</style>
