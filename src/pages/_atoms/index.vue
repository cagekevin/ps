<script setup lang="ts">
import { computed, ref } from 'vue'
import { ICON_NAMES } from '@/components/icon/names'
import Icon from '@/components/Icon.vue'
import IconFont from '@/components/IconFont.vue'
import GIcon from '@/components/GIcon.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import GDropdown from '@/components/GDropdown.vue'
import GMenu from '@/components/GMenu.vue'
import GMenuItem from '@/components/GMenuItem.vue'
import GTooltip from '@/components/GTooltip.vue'
import NewSpin from '@/components/NewSpin.vue'
import BackTop from '@/components/BackTop.vue'
import CepModal from '@/components/CepModal.vue'
import { useFeedbackStore } from '@/stores/feedback'

const feedback = useFeedbackStore()

const kw = ref('')
const shownIcons = computed(() => {
  const q = kw.value.trim().toLowerCase()
  return q ? ICON_NAMES.filter((n) => n.toLowerCase().includes(q)) : ICON_NAMES
})

const input = ref('')
const menuValue = ref<string | number>('a')
const dropdownVisible = ref(false)
const dropdownPlacement = ref<'bottom-start' | 'bottom-end'>('bottom-start')

const modalVisible = ref(false)

function pick(name: string) {
  feedback.info(name)
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>原子组件</h1>
      <span class="count">{{ ICON_NAMES.length }} 图标 · 10 组件</span>
    </header>

    <div id="atoms-scroll" class="page-body">
      <section>
        <h2>图标 Icon <em>点击复制名字到提示条</em></h2>
        <GInput v-model="kw" placeholder="搜图标名，如 chuangjian / guanbi" clearable size="small" />
        <div class="icon-grid">
          <button v-for="name in shownIcons" :key="name" class="icon-cell" :title="name" @click="pick(name)">
            <Icon :name="name" :size="18" />
            <span>{{ name.replace(/^icon/, '') }}</span>
          </button>
        </div>
        <p v-if="!shownIcons.length" class="empty">没有匹配的图标</p>
      </section>

      <section>
        <h2>按钮 GButton</h2>
        <div class="row">
          <GButton>默认</GButton>
          <GButton type="primary">主要</GButton>
          <GButton type="danger">危险</GButton>
          <GButton type="text">文字</GButton>
        </div>
        <div class="row">
          <GButton size="small">小号</GButton>
          <GButton size="small" type="primary">小号主要</GButton>
          <GButton disabled>禁用</GButton>
          <GButton loading>加载中</GButton>
        </div>
        <GButton block type="primary">通栏按钮</GButton>
      </section>

      <section>
        <h2>输入 GInput</h2>
        <GInput v-model="input" placeholder="输入点什么" clearable />
        <p class="hint">当前值：{{ input || '（空）' }}</p>
        <GInput placeholder="带前置图标" size="small">
          <template #prefix>
            <Icon name="iconsousuo" :size="13" />
          </template>
        </GInput>
        <GInput placeholder="禁用" disabled />
      </section>

      <section>
        <h2>下拉 GDropdown + GMenu</h2>
        <div class="row">
          <GDropdown v-model:visible="dropdownVisible" :placement="dropdownPlacement">
            <template #trigger>
              <GButton>
                选择：{{ menuValue }}
                <GIcon name="iconxiala" :size="'xs'" />
              </GButton>
            </template>
            <GMenu v-model="menuValue" @select="dropdownVisible = false">
              <GMenuItem value="a">选项 A</GMenuItem>
              <GMenuItem value="b">选项 B</GMenuItem>
              <GMenuItem value="c">选项 C</GMenuItem>
              <GMenuItem value="d" disabled>选项 D（禁用）</GMenuItem>
            </GMenu>
          </GDropdown>
          <GButton size="small" @click="dropdownPlacement = dropdownPlacement === 'bottom-start' ? 'bottom-end' : 'bottom-start'">
            切对齐
          </GButton>
        </div>
      </section>

      <section>
        <h2>提示 GTooltip</h2>
        <div class="row">
          <GTooltip content="上方提示">
            <GButton size="small">悬停上方</GButton>
          </GTooltip>
          <GTooltip content="下方提示" placement="bottom">
            <GButton size="small">悬停下方</GButton>
          </GTooltip>
        </div>
      </section>

      <section>
        <h2>加载 NewSpin</h2>
        <div class="row">
          <NewSpin :size="14" />
          <NewSpin tip="读取中…" />
        </div>
        <div class="mask-box">
          <span>局部加载</span>
          <NewSpin :show="true" mask tip="处理中…" />
        </div>
      </section>

      <section>
        <h2>图标字体 IconFont</h2>
        <div class="row">
          <IconFont name="iconchuangjian" :size="18" />
          <IconFont name="gdaicon-cep-filter" :size="18" />
          <span class="hint">映射不到 sprite 的会退回 gdaicon 字体</span>
        </div>
      </section>

      <section>
        <h2>反馈 Toast / Modal</h2>
        <div class="row">
          <GButton size="small" @click="feedback.ok('操作成功')">成功</GButton>
          <GButton size="small" @click="feedback.error('请先选择一个文字图层')">失败</GButton>
          <GButton size="small" @click="feedback.warn('该字体未安装')">警告</GButton>
          <GButton size="small" @click="feedback.info('共 259 个字体')">信息</GButton>
          <GButton size="small" @click="modalVisible = true">弹窗</GButton>
        </div>
        <p class="hint">连续点击会堆叠，同文案不重复。</p>
      </section>

      <section>
        <h2>回到顶部 BackTop</h2>
        <p class="hint">往下滚，右下角会出现按钮。</p>
        <div class="filler" />
      </section>
    </div>

    <BackTop target="#atoms-scroll" />
    <CepModal v-model:visible="modalVisible" title="提示">
      这是需要看清内容的场景，比如批量失败汇总。
    </CepModal>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.page-header {
  flex: 0 0 auto;
  height: var(--header-h);
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border);
}

h1 {
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: 600;
}

.count {
  margin-left: auto;
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

.page-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px 24px;
}

section {
  padding: 12px 0;
  border-bottom: 1px solid rgba(60, 60, 60, 0.6);
}

section:last-child {
  border-bottom: 0;
}

h2 {
  margin: 0 0 8px;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text);
}

h2 em {
  margin-left: 6px;
  color: var(--text-faint);
  font-size: var(--fs-xs);
  font-style: normal;
  font-weight: 400;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.row:last-child {
  margin-bottom: 0;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  margin-top: 8px;
  max-height: 210px;
  overflow-y: auto;
}

.icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 2px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  color: var(--text-dim);
}

.icon-cell:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.icon-cell span {
  width: 100%;
  font-size: 9px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hint {
  margin: 6px 0 0;
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

.empty {
  margin: 8px 0 0;
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

.mask-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  margin-top: 8px;
  border: 1px dashed var(--border);
  border-radius: var(--r-md);
  color: var(--text-faint);
  font-size: var(--fs-sm);
}

.filler {
  height: 420px;
}
</style>
