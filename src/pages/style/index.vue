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
import { KU_KINDS, KU_TAB_LABELS, type KuFontPreview } from '@/domain/style-library'
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
const { libraries, loading, error, currentName, warehouses, activeIndex } = storeToRefs(store)

/** 原版 `set.ysShowTab`（`app.v4.js:54657` 起 switchFun 读写它）；我们落 `sj_v5_ui.json`，不动 `sj_set.json` */
const showTabs = usePersistedRef<boolean[]>('styleShowTab', [true, false, false, false])

/** 组折叠：原版写库（`setShowStatus` → `updata`，`:50177-50179` 等），第 3 段接；本段只存页面内 */
const collapsed = ref<Record<string, boolean>>({})

/**
 * 仓库下拉是否展开。原版 `f_showDown` 只切本地 `showDown`（`app.v4.js:53754`），
 * 列表内容来自索引 `sj_kuStoreInfo.ini`；点某一项会写索引，属于写能力 → 本段只读展示。
 */
const warehouseOpen = ref(false)

/** 缩略图 `<id>.png` 加载失败的那几项：失败就不再画 `<img>`，只留原版那层 rgba(0,0,0,.3) 底 */
const brokenThumbs = ref<Set<string>>(new Set())

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
 * 用户目录只取一次：`userDir()` 每次都要过 CEP 的 Node 桥（`cep/fs.ts` 的 `nodeRequire`），
 * 而一屏几百个缩略图每帧要拼一次路径，逐项现取会把渲染拖成同步桥调用风暴。
 */
let cachedUserDir: string | null = null
function userDirOnce(): string {
  if (cachedUserDir === null) {
    try {
      cachedUserDir = userDir()
    } catch {
      cachedUserDir = ''
    }
  }
  return cachedUserDir
}

/**
 * 用户目录下某个资源的绝对路径。
 *
 * 原版 `src = isMac + <目录> + "/" + <文件名>`（渐变 `:50561`、样式缩略图 `:51352`），
 * `isMac = getOsPrefix()`（Mac `"file://"`、Windows `""`，`:72855-72862`）。
 * 没有 Node 的环境（浏览器 dev / 测试）拿不到目录就返回空串，由模板退化成"不画图"，
 * **不能让它把整页渲染打断**。
 */
function userFileSrc(relative: string): string {
  const dir = userDirOnce()
  return dir ? `${dir}/${relative}` : ''
}

/** 图片型渐变：`<userDir>/Gradient/<fileName>`（`path.kuGradient`，`:5225`） */
function gradientImageSrc(fileName = ''): string {
  return fileName ? userFileSrc(`Gradient/${fileName}`) : ''
}

/** 图层样式缩略图：`<userDir>/kuStyle/<id>.png`（`path.kuStyle`，`:5223`） */
function styleThumbSrc(thumb = ''): string {
  return thumb ? userFileSrc(`kuStyle/${thumb}`) : ''
}

function onThumbError(thumb: string) {
  brokenThumbs.value = new Set(brokenThumbs.value).add(thumb)
}

/**
 * 字体卡片的 `font-family`：原版 `family + ",'" + family + "','" + family + " " + weight + "'," + scriptFamily`
 * （`app.v4.js:50970`，逐个照抄，包括那个未加引号的首项）。
 */
function fontFamilyOf(preview: KuFontPreview): string {
  if (!preview.family) return ''
  const { family, weight, scriptFamily } = preview
  return `${family},'${family}','${family} ${weight}',${scriptFamily}`
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
    <!-- 原版 warehouse 组件（`app.v4.js:53747-53790`）：行内 16×16 图标 + 蓝色仓库名 + 10×10 箭头，
         点开是仓库列表（索引 `sj_kuStoreInfo.ini`）。切换仓库要写索引 → 本段只读展示。 -->
    <div class="style-warehouse">
      <div
        class="style-warehouse__row"
        title="仓库分组，管理样式"
        @click.stop="warehouseOpen = !warehouseOpen"
      >
        <Icon name="#iconmorencangku" size="md" />
        <p class="style-warehouse__name">{{ currentName }}</p>
        <Icon name="#iconzhankaizhedie" size="xs" class="style-warehouse__arrow" />
      </div>

      <div v-if="warehouseOpen" class="style-warehouse__down">
        <div class="style-warehouse__down-main">
          <div v-for="(warehouse, i) in warehouses" :key="i" class="style-warehouse__item">
            <Icon
              name="#icongouxuan"
              size="sm"
              class="style-warehouse__check"
              :class="{ 'is-hidden': i !== activeIndex }"
            />
            <p class="style-warehouse__item-name">{{ warehouse.name }}</p>
          </div>
        </div>
      </div>
    </div>

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
                :class="{
                  'style-item--image': kind === 'gradient' && !!gradientImageSrc(item.image),
                }"
                :title="item.name"
                @click="applyItem(kind, index, itemIndex, $event)"
              >
                <!-- 颜色 / 渐变：整块就是色块（原版 .color-block 直接带 backgroundColor / backgroundImage，
                     render `:49960` / `:50564`） -->
                <template v-if="kind === 'color' || kind === 'gradient'">
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
                </template>

                <!-- 字体：70×44 卡片 = 字体数 + N点 + 5×5 色点 + 「中文字」（render `:50956-50971`） -->
                <template v-else-if="kind === 'font' && item.fontPreview">
                  <div class="style-item__font-head">
                    <p class="style-item__font-count">{{ item.fontPreview.count }}</p>
                    <p class="style-item__font-size">{{ item.fontPreview.size }}</p>
                    <span
                      v-if="item.fontPreview.color"
                      class="style-item__font-dot"
                      :style="{ backgroundColor: item.fontPreview.color }"
                    />
                  </div>
                  <p
                    class="style-item__font-sample"
                    :style="{ fontFamily: fontFamilyOf(item.fontPreview) }"
                  >
                    中文字
                  </p>
                </template>

                <!-- 样式：26×26 缩略图 `kuStyle/<id>.png`（render `:51348-51353`）。
                     图挂了（文件不存在 / 没有 id）就不再画 <img>，留 .style-item 那层 rgba(0,0,0,.3) 底。 -->
                <template v-else-if="kind === 'style'">
                  <img
                    v-if="styleThumbSrc(item.thumb) && !brokenThumbs.has(item.thumb ?? '')"
                    class="style-item__thumb"
                    :src="styleThumbSrc(item.thumb)"
                    :alt="item.name"
                    @error="onThumbError(item.thumb ?? '')"
                  />
                </template>
              </div>

              <!-- 原版各组末尾的添加入口（如 `app.v4.js:49988-50000`）：底色 #535353、hover #444，
                   图标是 `.icon` 跟 1em（12px）。 -->
              <button
                class="style-item style-item__add"
                type="button"
                title="添加当前前景色（ctrl+点击取边框色，alt+点击取文字色）"
                @click="addItem(kind, index)"
              >
                <Icon name="#iconchuangjian" />
              </button>
            </div>
          </BaseGroup>
        </section>
      </template>
    </div>

    <BackTop target="#style-scroll" />

    <!-- 原版 .button-nav（49844）：添加分组 4 个 + 竖线 + 导入 / 导出。
         添加分组写库、导入导出是文件 IO，都属于第 3 段（T-48），本段保持 disabled。
         图标不带 size：原版本页是 `.svg-18`（清单 #93），但底排图标守卫要求全项目 1em
         （`tests/components/page-bottom-bar.test.ts:155`），本页跟着守卫走，18px 待统一决定。 -->
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
