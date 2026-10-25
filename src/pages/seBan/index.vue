<script setup lang="ts">
// 是什么：色板工具（独立 CEP 面板 `#/seBan`）——一排色点 + 两个按钮，只做上色
// 唯一入口：点击色点只发命令（命令再发 app event），页面不猜开关、不碰 jsx / data
// 替代了什么：原版 `%APPDATA%/fz.FengZi3Hao/index.html` 的色板面板
// 谁在用：`public/seBan.html?panel=seBan`（第三个 Extension）
// 禁止：页面不许 import `@/cep/*`；不许在这里判"智能填色"（开关在主面板）

import { onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import CepModal from '@/components/CepModal.vue'
import { useCommand } from '@/components/command/useCommand'
import { useSwatchStore, type SwatchItem } from '@/stores/swatch'
import SwatchDot from './components/SwatchDot.vue'

const store = useSwatchStore()

const addColor = useCommand('seban.addForegroundColor')
const setLimit = useCommand('seban.setRecentLimit')
const sendColor = useCommand('seban.sendColor')
const sendWireframe = useCommand('seban.sendWireframeColor')

onMounted(() => {
  void store.load()
})

/**
 * 发出去的是**磁盘上的原始形状**（`{name, color}`），不带视图模型的额外字段：
 * 主面板的 jsx 认 `color.isFill` 一类键，多塞会把它们冲掉。
 */
function payloadOf(item: SwatchItem): Record<string, unknown> {
  return { name: item.name, color: { ...item.color } }
}

function pick(item: SwatchItem): void {
  void sendColor.invoke({ item: payloadOf(item) })
}

function outline(item: SwatchItem): void {
  void sendWireframe.invoke({ item: payloadOf(item) })
}

const settingsVisible = ref(false)
const limitText = ref('')

function openSettings(): void {
  limitText.value = String(store.recentLimit)
  settingsVisible.value = true
}

function confirmLimit(): void {
  // 范围校验（0–15）在命令层，文案照抄官方；页面只负责把输入变成数字
  void setLimit.invoke({ limit: Number(limitText.value.trim()) })
}
</script>

<template>
  <div class="strip">
    <p v-if="store.error" class="strip__error" role="alert">
      {{ store.error }}
      <button type="button" class="strip__retry" @click="store.retry()">重试</button>
    </p>

    <template v-else>
      <!--
        降级（只坏一个数据文件 / 有条目认不出）：**复用上面那套 `strip__error` markup 与样式**，
        不新增控件、不新增样式。它只在"这一次读的结果真的不全"时出现
        （`degraded` 每次 load 开头都清空，读全了就是空串）⇒ 不刷屏、不 toast。
        文案与数量由 store 说（生产者），页面只转发（ADR-0023）。
      -->
      <p v-if="store.degraded" class="strip__error" role="status">
        {{ store.degraded }}
        <button type="button" class="strip__retry" @click="store.retry()">重试</button>
      </p>
      <div class="group" aria-label="最近颜色">
        <SwatchDot
          v-for="(item, index) in store.recent"
          :key="`recent-${index}`"
          :color="`#${item.color.hex}`"
          :label="`#${item.color.hex}`"
          @pick="pick(item)"
          @outline="outline(item)"
        />
      </div>

      <span class="divider" aria-hidden="true" />

      <div class="group" aria-label="常用颜色">
        <SwatchDot
          v-for="(item, index) in store.custom"
          :key="`custom-${index}`"
          :color="`#${item.color.hex}`"
          :label="`#${item.color.hex}`"
          @pick="pick(item)"
          @outline="outline(item)"
        />
      </div>

      <span class="divider" aria-hidden="true" />

      <div class="group group--actions">
        <GButton type="text" title="把当前颜色存进常用" @click="addColor.invoke()">
          <Icon name="#iconchuangjian" size="sm" />
        </GButton>
        <GButton type="text" title="最近颜色数量" @click="openSettings">
          <Icon name="#iconyonghushezhi" size="sm" />
        </GButton>
      </div>
    </template>
  </div>

  <CepModal v-model:visible="settingsVisible" title="最近颜色数量" @ok="confirmLimit">
    <GInput v-model="limitText" placeholder="0 - 15" @enter="confirmLimit" />
  </CepModal>
</template>

<style scoped>
/*
 * 一整排，无分区标题、无滚动容器。
 * 横排：最近颜色 │ 常用颜色 │ 按钮；竖排（面板收窄到约一个圆）时整体转成列，
 * 分隔线跟着转成横线——用户会把面板拖成一条竖排，这是主要形态之一。
 */
.strip {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--sp-2) 0;
  padding: var(--sp-2);
  box-sizing: border-box;
}

.group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  padding: 0 var(--sp-2);
}

.group--actions {
  gap: 0;
}

.divider {
  flex: 0 0 1px;
  align-self: stretch;
  margin: 0 var(--sp-2);
  background: var(--c-border-strong);
}

.strip__error {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: var(--sp-2);
  font-size: var(--fs-md);
  color: var(--c-danger);
}

.strip__retry {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-accent-solid);
  font-size: var(--fs-md);
  cursor: pointer;
}

/* 竖排形态（用户把面板拖成一条竖排时）：只覆盖方向，不改尺寸 */
@media (max-width: 120px) {
  .strip {
    flex-direction: column;
    align-items: center;
  }

  .strip .group {
    justify-content: center;
  }

  .strip .divider {
    width: 14px;
    height: 1px;
    margin: var(--sp-2) 0;
  }
}
</style>
