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
      <router-link v-for="item in navRoutes" :key="item.path" :to="item.path" class="nav-item">
        <!-- 原版导航图标统一 svg-24 -->
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" size="2xl" />
        <span v-else class="glyph">{{ item.meta?.glyph }}</span>
      </router-link>

      <div class="nav-spacer" />

      <router-link v-for="item in navBottomRoutes" :key="item.path" :to="item.path" class="nav-item">
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" size="2xl" />
        <span v-else class="glyph">{{ item.meta?.glyph }}</span>
      </router-link>


    </nav>

    <main class="content">
      <ErrorBoundary>
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
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

/* 原版 .sub-nav-item-inner{width:26px;height:26px}，在 40px 宽的导航条里居中 */
.nav-item {
  position: relative;
  width: var(--nav-item);
  height: var(--nav-item);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 透明边框占位，hover 时不发生尺寸跳变 */
  border: 1px solid transparent;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-icon);
  text-decoration: none;
  box-sizing: border-box;
}

/* 原版 .sub-nav-item-inner:hover{background:#4b4b4b;border:1px solid #6e6e6e;border-radius:4px} */
.nav-item:hover {
  background: var(--c-surface-raised);
  border-color: var(--c-border-checked);
  color: var(--c-text-inverse);
}

/* 原版激活态与 hover 同一条规则，图标变白 */
.nav-item.router-link-active {
  background: var(--c-surface-raised);
  border-color: var(--c-border-checked);
  color: var(--c-text-inverse);
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
