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
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" :size="17" />
        <span v-else class="glyph">{{ item.meta?.glyph }}</span>
      </router-link>

      <div class="nav-spacer" />

      <router-link v-for="item in navBottomRoutes" :key="item.path" :to="item.path" class="nav-item">
        <Icon v-if="item.meta?.icon" :name="item.meta.icon" :size="17" />
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

.nav {
  flex: 0 0 var(--nav-w);
  width: var(--nav-w);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-2) 0;
  background: var(--bg);
  border-right: 1px solid var(--border);
}

.nav-item {
  position: relative;
  width: var(--nav-item);
  height: var(--nav-item);
  margin-bottom: var(--sp-1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-icon);
  text-decoration: none;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--c-text-inverse);
}

.nav-item.router-link-active {
  background: var(--bg-active);
  color: var(--c-text-inverse);
}

.nav-item.router-link-active::before {
  content: '';
  position: absolute;
  left: calc(var(--sp-2) * -1);
  top: 50%;
  transform: translateY(-50%);
  width: var(--sp-1);
  height: 16px;
  border-radius: var(--r-sm);
  background: var(--accent);
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
