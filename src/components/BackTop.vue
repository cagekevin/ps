<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './Icon.vue'

const props = withDefaults(
  defineProps<{
    /** 滚动容器选择器，不传就监听 window */
    target?: string
    threshold?: number
    icon?: string
  }>(),
  { threshold: 240, icon: 'iconfanhuidingbu' },
)

const visible = ref(false)
let scroller: Window | HTMLElement = window

function currentTop(): number {
  return scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop
}

function onScroll() {
  visible.value = currentTop() > props.threshold
}

onMounted(() => {
  if (props.target) {
    const el = document.querySelector(props.target)
    if (el) scroller = el as HTMLElement
  }
  ;(scroller as EventTarget).addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  ;(scroller as EventTarget).removeEventListener('scroll', onScroll)
})

function toTop() {
  if (scroller === window) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    ;(scroller as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <transition name="slide-up">
    <button v-if="visible" class="back-top" type="button" title="回到顶部" @click="toTop">
      <Icon :name="icon" :size="16" />
    </button>
  </transition>
</template>

<style scoped>
.back-top {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 20;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--r-pill);
  background: var(--bg-panel);
  color: var(--text-dim);
  box-shadow: var(--shadow-pop);
}

.back-top:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

/* 过渡用 styles/motion.css 里的 .slide-up，不在这里重复定义 */
</style>
