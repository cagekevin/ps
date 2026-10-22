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
import { useCommand } from '@/components/command/useCommand'
import { usePersistedRef } from '@/composables/usePersisted'
import { userDir } from '@/cep/fs'
import { KU_KINDS, KU_TAB_LABELS } from '@/domain/style-library'
import { useStyleLibraryStore } from '@/stores/style-library'
import type { StyleModifier } from '@/commands/payloads'

/**
 * 样式页（`/style`）。
 *
 * 结构对照原版 `EC()`（`app.v4.js:49616-49885`）：
 * 仓库条（49650）→ 4 tab（49653）→ 四库列表（49685）→ 底栏（49844）→ 回顶（49828）。
 *
 * 第 1 段：只读骨架 + 三态。第 2 段：应用（6 条 jsx）与添加（3 条 jsx）经 `useCommand` 接上。
 * 本期仍不做：吸色到组、拖图片取色、仓库发送/移动、库文件与 `.kux` 导入导出（见 commands/style.ts 头部）。
 *
 * 原版没有页面标题栏（标题由左侧导航承担），所以不用 `PageShell`。
 */
const store = useStyleLibraryStore()
const { libraries, loading, error, currentName } = storeToRefs(store)

/** 原版 `set.ysShowTab`（`app.v4.js:54657` 起 switchFun 读写它）；我们落 `sj_v5_ui.json`，不动 `sj_set.json` */
const showTabs = usePersistedRef<boolean[]>('styleShowTab', [true, false, false, false])

/** 组折叠：原版写库（`setShowStatus` → `updata`，`:50177-50179` 等），第 3 段接；本段只存页面内 */
const collapsed = ref<Record<string, boolean>>({})

const applyColorCmd = useCommand('style.applyColor')
const applyGradientCmd = useCommand('style.applyGradient')
const applyStyleCmd = useCommand('style.applyStyle')
const addColorCmd = useCommand('style.addColor')
const addGradientCmd = useCommand('style.addGradient')
const addStyleCmd = useCommand('style.addStyle')

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

/** 四类库的项尺寸各不同（CSS 按这个类分派，见 index.css 的实测依据） */
function libClass(kind: string): string {
  return `style-lib--${kind}`
}

/**
 * 图片型渐变的 `<img>` src。
 *
 * 原版 `isMac + imgPath + fileName`（`app.v4.js:50561`、`imgPath = path.kuGradient + "/"` `:50617`），
 * `isMac = getOsPrefix()`：Mac 返回 `"file://"`，Windows 返回 `""`（`:72855-72862`）。
 * 我们这里拼 `<userDir>/Gradient/<fileName>`（`path.kuGradient = s + "/Gradient"`，`:5225`）。
 *
 * `userDir()` 在没有 Node 的环境（浏览器 dev / 测试）会抛 `NO_NODE`；预览图拿不到路径就
 * 退回 CSS 渐变（模板里 `item.swatch` 兜底），**不能让它把整页渲染打断**。
 */
function gradientImageSrc(fileName: string): string {
  if (!fileName) return ''
  let dir: string
  try {
    dir = userDir()
  } catch {
    return ''
  }
  return dir ? `${dir}/Gradient/${fileName}` : ''
}

/**
 * 原版 `useColor` 的修饰键路由（`app.v4.js:50128-50163`）：
 * ctrl/meta→形状填充、shift→边框颜色、alt→更改颜色（会回写项）、无→智能填充颜色。
 * 判据不是"能不能做"，而是 `ft.f/g/e`（`:70622-70638`）这三个修饰键。
 */
function modifierOf(event: MouseEvent): StyleModifier {
  if (event.ctrlKey || event.metaKey) return 'ctrl'
  if (event.shiftKey) return 'shift'
  if (event.altKey) return 'alt'
  return 'none'
}

async function applyItem(kind: string, groupIndex: number, itemIndex: number, event: MouseEvent) {
  // alt 应用颜色后 PS 侧可能改写这一项，成功后要重新读库
  const replaced = await applyKind(kind, groupIndex, itemIndex, modifierOf(event))
  if (replaced) await store.load()
}

async function applyKind(
  kind: string,
  groupIndex: number,
  itemIndex: number,
  modifier: StyleModifier,
): Promise<boolean> {
  if (kind === 'color') {
    await applyColorCmd.run({ groupIndex, itemIndex, modifier })
    return modifier === 'alt'
  }
  if (kind === 'gradient') {
    await applyGradientCmd.run({ groupIndex, itemIndex })
    return false
  }
  await applyStyleCmd.run({ groupIndex, itemIndex })
  return false
}

async function addItem(kind: string, groupIndex: number) {
  const ok =
    kind === 'color'
      ? await addColorCmd.run({ groupIndex }, '已添加前景色')
      : kind === 'gradient'
        ? await addGradientCmd.run({ groupIndex }, '已添加当前渐变')
        : await addStyleCmd.run({ groupIndex }, '已保存图层样式')

  if (ok) await store.load()
}

onMounted(() => {
  void store.load()
})
</script>

<template>
  <div class="style-page">
    <!-- 原版 warehouse 组件（49645）：下拉里的选择/改名/删除都会写索引，第 3 段接 -->
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

        <section v-for="kind in visibleKinds" :key="kind" class="style-lib" :class="libClass(kind)">
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
                @click="applyItem(kind, index, itemIndex, $event)"
              >
                <!-- 图片型渐变走 <img>（原版 :50558-50562）；路径拼不出来就退回 CSS 渐变 -->
                <img
                  v-if="item.image && gradientImageSrc(item.image)"
                  class="style-item__img"
                  :src="gradientImageSrc(item.image)"
                  :alt="item.name"
                />
                <span
                  v-else-if="item.swatch"
                  class="style-item__swatch"
                  :style="{ background: item.swatch }"
                />
                <span v-else class="style-item__text">{{ item.meta ?? item.name }}</span>
              </div>

              <!-- 原版各组末尾的添加入口（如 `app.v4.js:49988-50000`）：
                   ctrl+点击=取前景色、shift=取边框色、alt=取文字色、普通=吸色（本期不做） -->
              <button
                class="style-item style-item__add"
                type="button"
                title="添加当前前景色（ctrl+点击取边框色，alt+点击取文字色）"
                @click="addItem(kind, index)"
              >
                <Icon name="#iconchuangjian" size="sm" />
              </button>
            </div>
          </BaseGroup>
        </section>
      </template>
    </div>

    <BackTop target="#style-scroll" />

    <!-- 原版 .button-nav（49844）：添加分组 4 个 + 竖线 + 导入 / 导出。
         添加分组写库、导入导出是文件 IO，都属于第 3 段（T-48），本段保持 disabled。
         图标不带 size：原版底排统一是 baseIcon，图标跟 1em（12px），与动作页一致。 -->
    <PageBottomBar>
      <button class="g-bottom-bar__icon" type="button" title="添加颜色分组" disabled>
        <Icon name="#iconchuangjian" />
      </button>
      <button class="g-bottom-bar__icon" type="button" title="添加渐变分组" disabled>
        <Icon name="#iconchuangjian" />
      </button>
      <button class="g-bottom-bar__icon" type="button" title="添加字体分组" disabled>
        <Icon name="#iconzitimianban" />
      </button>
      <button class="g-bottom-bar__icon" type="button" title="添加样式分组" disabled>
        <Icon name="#iconxinjianyangshifenzu" />
      </button>
      <span class="g-bottom-bar__divider" />
      <button class="g-bottom-bar__icon" type="button" title="导入" disabled>
        <Icon name="#icondaoru" />
      </button>
      <button class="g-bottom-bar__icon" type="button" title="导出" disabled>
        <Icon name="#icondaochu" />
      </button>
    </PageBottomBar>
  </div>
</template>

<style scoped src="./index.css"></style>
