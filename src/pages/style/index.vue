<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import BackTop from '@/components/BackTop.vue'
import BaseGroup from '@/components/BaseGroup.vue'
import EmptyState from '@/components/EmptyState.vue'
import GButton from '@/components/GButton.vue'
import Icon from '@/components/Icon.vue'
import MultiTabs from '@/components/MultiTabs.vue'
import PageBottomBar from '@/components/PageBottomBar.vue'
import { usePersistedRef } from '@/composables/usePersisted'
import { KU_KINDS, KU_TAB_LABELS } from '@/domain/style-library'
import { useStyleLibraryStore } from '@/stores/style-library'

/**
 * 样式页（`/style`）第 1 段：只读。
 *
 * 结构对照原版 `EC()`（`app.v4.js:49616-49885`）：
 * 仓库条（49650）→ 4 tab（49653）→ 四库列表（49685）→ 底栏（49844）→ 回顶（49828）。
 * 本段**不写库、不接 jsx**：添加/应用/吸色/导入导出都在第 2 段（台账 T-48）。
 *
 * 原版没有页面标题栏（标题由左侧导航承担），所以不用 `PageShell`。
 */
const store = useStyleLibraryStore()
const { libraries, loading, error, currentName } = storeToRefs(store)

/** 原版 `set.ysShowTab`（`app.v4.js:54657` 起 switchFun 读写它）；我们落 `sj_v5_ui.json`，不动 `sj_set.json` */
const showTabs = usePersistedRef<boolean[]>('styleShowTab', [true, false, false, false])

/** 组折叠：原版写库（`setShowStatus` → `updata`），第 2 段接；本段只存页面内 */
const collapsed = ref<Record<string, boolean>>({})

const visibleKinds = computed(() => KU_KINDS.filter((_, index) => !!showTabs.value[index]))

/** 四个库都没有分组才算"空库"；某个库单独空由该库自己的提示承担 */
const isEmpty = computed(() =>
  visibleKinds.value.every((kind) => libraries.value[kind].length === 0),
)

function groupOpen(kind: string, index: number, show: boolean): boolean {
  const key = `${kind}-${index}`
  return collapsed.value[key] === undefined ? show : !collapsed.value[key]
}

function toggleGroup(kind: string, index: number) {
  const key = `${kind}-${index}`
  collapsed.value[key] = !collapsed.value[key]
}

onMounted(() => {
  void store.load()
})
</script>

<template>
  <div class="style-page">
    <!-- 原版 warehouse 组件（49645）：下拉里的选择/改名/删除都会写索引，第 2 段接 -->
    <div class="style-warehouse" title="仓库分组，管理样式">{{ currentName }}</div>

    <div class="style-tabs">
      <MultiTabs v-model="showTabs" :labels="KU_TAB_LABELS" />
    </div>

    <div id="style-scroll" class="style-body">
      <p v-if="loading" class="style-hint style-loading">正在读取样式库…</p>

      <div v-else-if="error" class="style-error">
        <p class="style-hint style-hint--error">{{ error }}</p>
        <GButton class="style-retry" size="small" @click="store.retry()">重试</GButton>
      </div>

      <EmptyState v-else-if="isEmpty" compact text="样式库还是空的" />

      <template v-else>
        <p v-if="!visibleKinds.length" class="style-hint">
          四个库都已隐藏，ctrl+点击任一标签可显示
        </p>

        <section v-for="kind in visibleKinds" :key="kind" class="style-lib">
          <EmptyState v-if="!libraries[kind].length" compact text="该库还没有分组" />

          <BaseGroup
            v-for="(group, index) in libraries[kind]"
            :key="`${kind}-${index}`"
            :text="group.name"
            :value="groupOpen(kind, index, group.show)"
            @change="toggleGroup(kind, index)"
          >
            <div class="style-items">
              <div
                v-for="(item, itemIndex) in group.items"
                :key="itemIndex"
                class="style-item"
                :title="item.meta ? `${item.name} · ${item.meta}` : item.name"
              >
                <span
                  v-if="item.swatch"
                  class="style-item__swatch"
                  :style="{ background: item.swatch }"
                />
                <span v-else class="style-item__text">{{ item.meta ?? item.name }}</span>
              </div>
            </div>
          </BaseGroup>
        </section>
      </template>
    </div>

    <BackTop target="#style-scroll" />

    <!-- 原版 .button-nav（49844）：添加分组 4 个 + 竖线 + 导入 / 导出。
         本段全部 disabled——它们都写库，第 2 段（T-48）接。 -->
    <PageBottomBar>
      <button class="g-bottom-bar__icon" type="button" title="添加颜色分组" disabled>
        <Icon name="#iconchuangjian" size="md" />
      </button>
      <button class="g-bottom-bar__icon" type="button" title="添加渐变分组" disabled>
        <Icon name="#iconchuangjian" size="md" />
      </button>
      <button class="g-bottom-bar__icon" type="button" title="添加字体分组" disabled>
        <Icon name="#iconzitimianban" size="md" />
      </button>
      <button class="g-bottom-bar__icon" type="button" title="添加样式分组" disabled>
        <Icon name="#iconxinjianyangshifenzu" size="md" />
      </button>
      <span class="g-bottom-bar__divider" />
      <button class="g-bottom-bar__icon" type="button" title="导入" disabled>
        <Icon name="#icondaoru" size="md" />
      </button>
      <button class="g-bottom-bar__icon" type="button" title="导出" disabled>
        <Icon name="#icondaochu" size="md" />
      </button>
    </PageBottomBar>
  </div>
</template>

<style scoped src="./index.css"></style>
