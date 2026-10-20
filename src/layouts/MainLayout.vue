<script setup lang="ts">
import { navBottomRoutes, navRoutes } from '@/router'
import { runtimeInfo } from '@/cep/ps'
import Icon from '@/components/Icon.vue'
import ToastHost from '@/components/ToastHost.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

const info = runtimeInfo()

function reload() {
  location.reload()
}
</script>

<template>
  <div class="layout">
    <nav class="nav">
      <router-link v-for="item in navRoutes" :key="item.path" :to="item.path" class="nav-item">
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" size="lg" />
        <span v-else class="glyph">{{ item.meta?.glyph }}</span>
      </router-link>

      <div class="nav-spacer" />

      <router-link v-for="item in navBottomRoutes" :key="item.path" :to="item.path" class="nav-item">
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" size="lg" />
        <span v-else class="glyph">{{ item.meta?.glyph }}</span>
      </router-link>

      <div class="nav-mode" :class="info.inCep ? 'ps' : 'mock'">{{ info.inCep ? 'PS' : 'MK' }}</div>
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
  padding: 0;
  background: var(--bg);
}

.nav-item {
  position: relative;
  width: var(--nav-w);
  height: var(--nav-w);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--c-icon);
  text-decoration: none;
  box-sizing: border-box;
}

/* 原版 .sub-nav-item-inner:hover{background:#4b4b4b;border:1px solid #6e6e6e;border-radius:4px} */
.nav-item:hover {
  background: var(--c-surface-raised);
  border: 1px solid var(--c-border-checked);
  border-radius: var(--r-md);
  color: var(--c-text-inverse);
}

/* 原版 .nav-item-act{color:#006fff;background:#222}：凹陷底 + 蓝色图标 */
.nav-item.router-link-active {
  background: var(--bg-sunken);
  color: var(--accent);
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
