<script setup lang="ts">
import Icon from './Icon.vue'

/**
 * 回到顶部。
 *
 * 原版 `app.v4.js:49754-49773`：`div.returnTop` 直接渲染，**没有 `v-if` / `v-show`，也没有滚动阈值** ——
 * 常显。所以这里不再监听滚动、不再有 `threshold`；`target` 只用来决定滚哪个容器。
 */
const props = withDefaults(
  defineProps<{
    /** 滚动容器选择器，不传就滚 window */
    target?: string
    icon?: string
  }>(),
  { icon: 'iconfanhuidingbu' },
)

function toTop() {
  const el = props.target ? document.querySelector(props.target) : null
  if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <button class="back-top" type="button" title="回到顶部" @click="toTop">
    <Icon :name="icon" size="sm" />
  </button>
</template>

<style scoped>
/* 原版 .returnTop[data-v-7f4f5fe0]{position:absolute;right:10px;bottom:47px;width:26px;height:26px;
   border-radius:5px;background:#535353}；svg 是 14×15.22、fill:#c3c3c3。
   规则里没有 border / box-shadow / :hover，所以这里是纯色块。
   图标高度原版是 15.22px（等比），Icon 只支持正方形尺寸 → 14×14，差 1.22px（见清单 #85）。 */
.back-top {
  position: absolute;
  right: 10px;
  bottom: 47px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: var(--r-input);
  background: var(--c-return-top);
  color: var(--text);
  cursor: pointer;
}
</style>
