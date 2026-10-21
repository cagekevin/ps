<script setup lang="ts">
import { navBottomRoutes, navRoutes } from '@/router'

import Icon from '@/components/Icon.vue'
import ToastHost from '@/components/ToastHost.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'



// 构建时间只打日志，不放在界面上（原版导航底部只有设置齿轮）
if (import.meta.env.DEV) console.info(`[build] ${__BUILD_TIME__}`)
</script>

<template>
  <div class="layout">
    <nav class="nav">
      <router-link
        v-for="item in navRoutes"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :data-label="item.meta?.title"
      >
        <!-- 原版导航图标统一 svg-24 -->
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" size="2xl" />
        <span v-else class="glyph">{{ item.meta?.glyph }}</span>
      </router-link>

      <div class="nav-spacer" />

      <!-- 原版底部是 .sub-nav-item：26×26、图标 16px -->
      <router-link
        v-for="item in navBottomRoutes"
        :key="item.path"
        :to="item.path"
        class="nav-item is-sub"
      >
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" size="md" />
        <span v-else class="glyph">{{ item.meta?.glyph }}</span>
      </router-link>


    </nav>

    <main class="content">
      <ErrorBoundary>
        <!-- 页面切换不做淡入淡出：整页渐变会让人以为在闪 -->
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </ErrorBoundary>
    </main>

    <ToastHost />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100%;
  background: var(--bg);
}

/* 原版：#nav{width:40px;height:100vh;background:#535353}，导航项 40×40 无圆角 */
.nav {
  flex: 0 0 var(--nav-w);
  width: var(--nav-w);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-2) 0;
  background: var(--c-nav);
}

/* 原版 .nav-item{width:40px;height:40px;line-height:40px;text-align:center;cursor:default} */
.nav-item {
  position: relative;
  width: var(--nav-w);
  height: var(--nav-w);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--c-icon);
  text-decoration: none;
  box-sizing: border-box;
  cursor: default;
}

/* 原版 .nav-item-active{background-color:#434343} */
.nav-item.router-link-active {
  background: var(--c-nav-active);
  color: var(--c-text-inverse);
}

/* 原版 hover 是 rgba(0,0,0,.9)（近黑），但那要和右侧滑出的黑标签连成一条才合理。
   我们不做黑标签，近黑单独出现就是一次大幅跳变，看起来像闪。
   改成与激活态同色 #434343，色差小，不需要过渡也不会刺眼。 */
.nav-item:hover {
  background: var(--c-nav-active);
  color: var(--c-text-inverse);
}

/* SVG <use> 随父级背景重绘会重新解析 symbol，在旧版 Chromium 里表现为图标闪一下。
   把图标放到独立合成层，父级怎么重绘都不影响它。 */
.nav-item > svg {
  transform: translateZ(0);
}

/* 原版 .tips：left:40px、满高、左右 20px 内边距、右侧圆角、z-index 99 */
.nav-item::after {
  content: attr(data-label);
  position: absolute;
  left: 100%;
  top: 0;
  z-index: var(--z-dropdown);
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 var(--sp-6);
  border-radius: 0 var(--r-input) var(--r-input) 0;
  /* 和悬停项同色，两者拼成一条，不出现深浅断层 */
  background: var(--c-nav-active);
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
}

.nav-item:hover::after {
  opacity: 1;
}

/* 原版底部是另一套：.sub-nav-item{width:26px;height:26px} 装 .sub-nav-item-inner，
   图标 svg-16，hover #4b4b4b + 1px #6e6e6e，没有滑出标签。 */
.nav-item.is-sub {
  width: var(--nav-item);
  height: var(--nav-item);
  border: 1px solid transparent;
  border-radius: var(--r-md);
}

.nav-item.is-sub:hover {
  background: var(--c-surface-raised);
  border-color: var(--c-border-checked);
}

.nav-item.is-sub::after {
  content: none;
}

.glyph {
  font-size: var(--fs-lg);
  line-height: 1;
}

.nav-spacer {
  flex: 1;
}

.nav-mode {
  width: 26px;
  height: 14px;
  margin: var(--sp-1) 0 var(--sp-2);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  letter-spacing: 0.3px;
}

.nav-mode.ps {
  background: var(--c-ok-a18);
  color: var(--ok);
}

.nav-mode.mock {
  background: var(--c-warn-a18);
  color: var(--warn);
}

.reload {
  margin-bottom: 0;
  font-size: var(--fs-lg);
}

.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
