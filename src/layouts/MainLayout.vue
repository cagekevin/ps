<script setup lang="ts">
import { navBottomRoutes, navRoutes } from '@/router'

import Icon from '@/components/Icon.vue'
import ToastHost from '@/components/ToastHost.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'



function reload() {
  location.reload()
}
</script>

<template>
  <div class="layout">
    <nav class="nav">
      <router-link v-for="item in navRoutes" :key="item.path" :to="item.path" class="nav-item">
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" size="md" />
        <span v-else class="glyph">{{ item.meta?.glyph }}</span>
      </router-link>

      <div class="nav-spacer" />

      <router-link v-for="item in navBottomRoutes" :key="item.path" :to="item.path" class="nav-item">
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" size="md" />
        <span v-else class="glyph">{{ item.meta?.glyph }}</span>
      </router-link>

      <button class="nav-item reload" @click="reload">↻</button>
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
  background: var(--bg);
}

.nav-item {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--c-icon);
  text-decoration: none;
  box-sizing: border-box;
  transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}

.nav-item:hover {
  background: var(--c-hover-2);
  color: var(--c-text-inverse);
}

/* 当前所在：白 10% 底 + 强调色图标，一眼能看出 */
/* 原版：.sub-nav-item-active 背景 #4b4b4b，图标变白 */
.nav-item.router-link-active {
  background: var(--c-surface-raised);
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
