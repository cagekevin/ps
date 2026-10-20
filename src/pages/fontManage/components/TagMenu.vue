<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { FontTag } from '@/cep/types'

/**
 * 字体标签弹层。对应原版截图：
 *   标题「标签」/ 输入框（标签名称不超过8个字）/ 已添加的标签(N) / 全部(N)
 *   两段都是灰底圆角 chip，点一下切换。
 */
const props = defineProps<{
  visible: boolean
  x: number
  y: number
  tags: FontTag[]
  /** 该字体已有的标签 */
  active: string[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'toggle', text: string): void
  (e: 'create', text: string): void
}>()

const boxRef = ref<HTMLElement>()
const keyword = ref('')
const top = ref(props.y)

const added = computed(() => props.tags.filter((t) => props.active.includes(t.text)))
const rest = computed(() => props.tags.filter((t) => !props.active.includes(t.text)))

function close() {
  emit('update:visible', false)
}

function submit() {
  const value = keyword.value.trim()
  if (!value) return
  if (props.tags.some((t) => t.text === value)) emit('toggle', value)
  else emit('create', value)
  keyword.value = ''
}

function onDocDown(event: MouseEvent) {
  if (!props.visible) return
  if (boxRef.value && !boxRef.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.visible,
  (value) => {
    if (!value) return
    keyword.value = ''
    top.value = Math.min(props.y, window.innerHeight - 220)
  },
)

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
  <Teleport to="body">
    <div v-if="visible" ref="boxRef" class="tm" :style="{ left: `${x}px`, top: `${top}px` }">
      <div class="tm__title">标签</div>

      <div class="tm__field">
        <input
          v-model="keyword"
          class="tm__input"
          placeholder="标签名称不超过8个字"
          maxlength="8"
          @keydown.enter="submit"
        />
        <button v-if="keyword" class="tm__clear" type="button" @click="keyword = ''">×</button>
      </div>

      <p class="tm__section">已添加的标签({{ added.length }})</p>
      <div v-if="added.length" class="tm__chips">
        <button
          v-for="tag in added"
          :key="tag.text"
          class="tm__chip is-on"
          type="button"
          @click="emit('toggle', tag.text)"
        >
          {{ tag.text }}
        </button>
      </div>

      <p class="tm__section">全部({{ tags.length }})</p>
      <div class="tm__chips">
        <button
          v-for="tag in rest"
          :key="tag.text"
          class="tm__chip"
          type="button"
          @click="emit('toggle', tag.text)"
        >
          {{ tag.text }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tm {
  position: fixed;
  z-index: var(--z-dropdown);
  width: 180px;
  padding: var(--sp-4);
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-md);
  background: var(--c-float);
  box-shadow: var(--shadow-pop);
  box-sizing: border-box;
}

.tm__title {
  color: var(--c-text-strong);
  font-size: var(--fs-md);
  line-height: 1.4;
}

.tm__field {
  position: relative;
  margin: var(--sp-4) 0 var(--sp-2);
}

.tm__input {
  width: 100%;
  height: var(--h-control);
  padding: 0 var(--sp-6) 0 var(--sp-3);
  border: 1px solid var(--accent);
  border-radius: var(--r-md);
  background: var(--c-input);
  color: var(--c-text-inverse);
  font-size: var(--fs-sm);
  box-sizing: border-box;
}

.tm__input::placeholder {
  color: var(--c-text-muted);
}

.tm__input:focus {
  outline: none;
}

.tm__clear {
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

.tm__section {
  margin: var(--sp-4) 0 var(--sp-2);
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  line-height: 1.4;
}

.tm__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.tm__chip {
  padding: var(--sp-1) var(--sp-3);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  background: var(--c-surface-raised);
  color: var(--c-text-onchip);
  font-size: var(--fs-md);
  line-height: 16px;
  white-space: nowrap;
}

.tm__chip:hover {
  background: var(--c-surface-raised-hover);
}

.tm__chip.is-on {
  border-color: var(--accent);
}
</style>
