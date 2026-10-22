<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNavStore } from '@/stores/nav'

import Icon from '@/components/Icon.vue'
import ToastHost from '@/components/ToastHost.vue'
import TaskHud from '@/components/TaskHud.vue'
import ConfirmHost from '@/components/ConfirmHost.vue'
import GlobalLoading from '@/components/GlobalLoading.vue'
import DebugLog from '@/components/DebugLog.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { log } from '@/utils/logger'

// 构建时间只打日志，不放在界面上（原版导航底部只有设置齿轮）
if (import.meta.env.DEV) log.info('build', __BUILD_TIME__)

const route = useRoute()
const nav = useNavStore()
const standalone = computed(() => route.meta.standalone === true)
</script>

<template>
  <div class="layout" :class="{ 'is-standalone': standalone }">
    <nav v-if="!standalone" class="nav">
      <router-link
        v-for="item in nav.topItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :data-label="item.title"
      >
        <!-- 原版导航图标统一 svg-24 -->
        <Icon v-if="item.icon" :name="item.icon" size="2xl" />
        <span v-else class="glyph">{{ item.glyph }}</span>
      </router-link>

      <div class="nav-spacer" />

      <!-- 原版底部是 .sub-nav-item：26×26、图标 16px -->
      <router-link
        v-for="item in nav.bottomItems"
        :key="item.path"
        :to="item.path"
        class="nav-item is-sub"
      >
        <Icon v-if="item.icon" :name="item.icon" size="md" />
        <span v-else class="glyph">{{ item.glyph }}</span>
      </router-link>
    </nav>

    <main class="content">
      <!-- key 用路由：某页崩过之后切到别的页，错误边界必须重置，
           否则左侧导航能点但内容区永远停在上一个页面的报错上 -->
      <ErrorBoundary :key="$route.fullPath">
        <!-- 页面切换不做淡入淡出：整页渐变会让人以为在闪 -->
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </ErrorBoundary>
    </main>

    <ToastHost />
    <TaskHud />
    <ConfirmHost />
    <GlobalLoading />
    <DebugLog />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100%;
  background: var(--bg);
}

.layout.is-standalone .content {
  width: 100%;
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

/* 原版 hover 是 rgba(0,0,0,.9)（近黑），但它本来就要和右侧滑出的标签
   拼成一条连续的深色条。这里用 #434343（与激活态同色），
   色差小，不需要过渡也不会刺眼。 */
.nav-item:hover {
  background: var(--c-nav-active);
  color: var(--c-text-inverse);
}

/* 原版 .tips{left:40px;height:100%;padding:0 20px;border-radius:0 5px 5px 0;z-index:99}
   悬停时从右侧滑出，显示该页名称 */
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

.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
