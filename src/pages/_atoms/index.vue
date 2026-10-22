<script setup lang="ts">
/**
 * 控件模板 / 总览。
 *
 * 为什么存在：
 * - 所有新页面只能从这里已经出现的控件里选；
 * - 每个控件只演示“允许的用法”，不演示临时样式；
 * - 需要新控件时，先按 docs/规范/新控件准入.md 报备，不在这里偷偷加。
 *
 * 页面骨架：PageShell 是唯一入口。页面不自己写 header / 背景 / 滚动区。
 */
import { ref } from 'vue'
import ActionGrid, { type GridItem } from '@/components/ActionGrid.vue'
import BackTop from '@/components/BackTop.vue'
import BaseGroup from '@/components/BaseGroup.vue'
import CepModal from '@/components/CepModal.vue'
import CheckBox from '@/components/CheckBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import GButton from '@/components/GButton.vue'
import GDropdown from '@/components/GDropdown.vue'
import GInput from '@/components/GInput.vue'
import GMenu from '@/components/GMenu.vue'
import GMenuItem from '@/components/GMenuItem.vue'
import GPopover from '@/components/GPopover.vue'
import GTooltip from '@/components/GTooltip.vue'
import Icon from '@/components/Icon.vue'
import NewSpin from '@/components/NewSpin.vue'
import PageShell from '@/components/PageShell.vue'
import SelectBox from '@/components/SelectBox.vue'
import SettingsSection from '@/components/SettingsSection.vue'
import { ICON_NAMES } from '@/components/icon/names'
import { useFeedbackStore } from '@/stores/feedback'

const feedback = useFeedbackStore()

const checked = ref(true)
const input = ref('')
const selectIndex = ref(0)
const menuValue = ref<string | number>('a')
const dropdownVisible = ref(false)
const popoverOpen = ref(false)
const modalVisible = ref(false)
const groupOpen = ref(true)

const selectOptions = [{ label: '选项一' }, { label: '选项二' }, { label: '选项三' }]

const gridItems: GridItem[] = [
  { text: '按钮一', key: 'demo.one' },
  { text: '按钮二', key: 'demo.two' },
  { text: '按钮三', key: 'demo.three' },
]

const iconNames = ICON_NAMES.slice(0, 24)

function toast(message: string) {
  feedback.info(message)
}
</script>

<template>
  <PageShell title="控件模板" count="只允许从这里选">
    <!--
      GButton：唯一按钮。
      允许：4 种 type × 2 种 size + block/disabled/loading。
      禁止：页面再写 .btn-1 / 自定义高度 / 自定义颜色。
    -->
    <section class="demo-section">
      <h2>按钮 GButton</h2>
      <div class="demo-row">
        <GButton>默认</GButton>
        <GButton type="primary">主要</GButton>
        <GButton type="danger">危险</GButton>
        <GButton type="text">文字</GButton>
      </div>
      <div class="demo-row">
        <GButton size="small">小号</GButton>
        <GButton size="small" type="primary">小号主要</GButton>
        <GButton disabled>禁用</GButton>
        <GButton loading>加载中</GButton>
      </div>
      <GButton block type="primary">通栏按钮</GButton>
      <div class="demo-row">
        <GButton grid :columns="3">网格按钮</GButton>
        <GButton grid :columns="3">网格按钮</GButton>
        <GButton grid :columns="3">网格按钮</GButton>
      </div>
    </section>

    <!-- EmptyState：默认带官方插画；compact 只输出一行文字 -->
    <section class="demo-section">
      <h2>空态 EmptyState</h2>
      <EmptyState compact text="这里没有内容" />
      <EmptyState text="没有找到匹配的字体" />
    </section>

    <!--
      CheckBox / GInput / SelectBox：表单三件套。
      CheckBox 固定 14×14，页面不能调大小；
      GInput 只有 small / medium；
      SelectBox 只接受 options + 索引，页面不自己画下拉。
    -->
    <section class="demo-section">
      <h2>表单控件</h2>
      <div class="demo-row">
        <CheckBox v-model="checked">开启选项</CheckBox>
        <CheckBox :model-value="false" disabled>禁用</CheckBox>
      </div>
      <div class="demo-row">
        <GInput v-model="input" placeholder="输入内容" clearable />
        <GInput placeholder="小号输入" size="small" />
      </div>
      <div class="demo-row">
        <SelectBox v-model="selectIndex" :options="selectOptions" />
      </div>
    </section>

    <!--
      GDropdown / GMenu / GPopover：浮层只有这三种用法。
      GDropdown 用于选择；GMenu 只负责菜单项；GPopover 是通用锚点浮层。
      页面不写 position: absolute / 遮罩 / 点外部关闭。
    -->
    <section class="demo-section">
      <h2>浮层</h2>
      <div class="demo-row">
        <GDropdown v-model:visible="dropdownVisible" placement="bottom-start">
          <template #trigger>
            <GButton>
              菜单：{{ menuValue }}
              <Icon name="iconxiala" size="xs" />
            </GButton>
          </template>
          <GMenu v-model="menuValue" @select="dropdownVisible = false">
            <GMenuItem value="a">选项 A</GMenuItem>
            <GMenuItem value="b">选项 B</GMenuItem>
            <GMenuItem value="c" disabled>选项 C（禁用）</GMenuItem>
          </GMenu>
        </GDropdown>

        <GPopover v-model:open="popoverOpen" placement="bottom-start">
          <template #trigger>
            <GButton size="small">通用浮层</GButton>
          </template>
          <div class="demo-panel">
            <p>内容由调用方提供，定位/关闭由 GPopover 负责。</p>
            <GButton size="small" @click="popoverOpen = false">关闭</GButton>
          </div>
        </GPopover>

        <GTooltip content="这是 tooltip">
          <GButton size="small">悬停提示</GButton>
        </GTooltip>
      </div>
    </section>

    <!--
      SettingsSection / BaseGroup：两个折叠容器。
      SettingsSection 只用于设置页；BaseGroup 只用于动作页。
      两者都不允许页面复制箭头/标题样式。
    -->
    <section class="demo-section">
      <h2>折叠与分组</h2>
      <SettingsSection title="设置折叠行" :default-open="true">
        <p>设置页内容只能放在 SettingsSection 的默认插槽里。</p>
        <CheckBox v-model="checked">设置项</CheckBox>
      </SettingsSection>

      <BaseGroup
        :text="groupOpen ? '收起分组' : '展开分组'"
        :value="groupOpen"
        @change="groupOpen = $event"
      >
        <p>动作页分组内容。</p>
      </BaseGroup>
    </section>

    <!--
      ActionGrid：动作按钮/自由面板共用。
      只传 item 数据，不在这里写按钮样式。
    -->
    <section class="demo-section">
      <h2>按钮网格 ActionGrid</h2>
      <ActionGrid
        :items="gridItems"
        :columns="2"
        show-text
        @run="(item) => toast(`点击 ${item.text}`)"
      />
    </section>

    <!--
      CepModal：唯一弹窗外壳。
      页面不写遮罩、标题栏、footer。
    -->
    <section class="demo-section">
      <h2>弹窗与反馈</h2>
      <div class="demo-row">
        <GButton size="small" @click="modalVisible = true">打开弹窗</GButton>
        <GButton size="small" @click="toast('操作成功')">Toast</GButton>
      </div>
      <div class="demo-row">
        <NewSpin :size="14" />
        <NewSpin tip="读取中…" />
      </div>
    </section>

    <!--
      Icon：sprite 图标。size 只取规范里的档位，不写裸 px。
    -->
    <section class="demo-section">
      <h2>图标 Icon</h2>
      <div class="icon-grid">
        <span v-for="name in iconNames" :key="name" class="icon-cell">
          <Icon :name="name" size="md" />
          <span>{{ name.replace(/^icon/, '') }}</span>
        </span>
      </div>
    </section>

    <!--
      BackTop：页面底部唯一滚动辅助件。
    -->
    <section class="demo-section">
      <h2>返回顶部</h2>
      <p>页面底部出现 BackTop；新页面不要自己写回到顶部按钮。</p>
    </section>

    <CepModal v-model:visible="modalVisible" title="提示"> 这是 CepModal 的标准内容区。 </CepModal>

    <BackTop />
  </PageShell>
</template>

<style scoped>
/* 这里只演示排版，不定义控件皮肤；控件样式必须在 components/ 内 */
.demo-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-exact-10);
  border-bottom: var(--sp-exact-1) solid var(--c-border);
}

h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: var(--fs-md);
  font-weight: 500;
}

.demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
}

.demo-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  width: 100%;
  padding: var(--sp-3);
  color: var(--text);
  font-size: var(--fs-sm);
}

.demo-panel p {
  margin: 0;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sp-2);
}

.icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2);
  color: var(--text-dim);
  font-size: var(--fs-xs);
  text-align: center;
}

p {
  margin: 0;
  color: var(--text-dim);
  font-size: var(--fs-sm);
  line-height: 1.5;
}
</style>
