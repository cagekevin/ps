<script lang="ts">
/**
 * 样式页右键菜单的一项（对应原版 `$menu` 的 data 数组元素，`app.v4.js:50229-50321`）。
 *
 * `text:"fg"` 在原版是分隔线（渲染成 `<hr class="menu-hr">`，`:319-320`），这里用 `separator` 表达，
 * 不照抄那个字符串——原版还给它挂了一个 `addGroup` 回调（`:50341-50347`），那是原版的 bug。
 */
export interface StyleMenuEntry {
  text: string
  /** 原版 `svg` 字段：只有「创建新组」带图标（`:50231`） */
  icon?: string
  separator?: boolean
  /** 命令还没实现的功能：渲染但置灰（原版 `$menu` 没有禁用概念，这是我们的偏离） */
  disabled?: boolean
  title?: string
  action?: () => void
}
</script>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import { useDismiss } from '@/composables/useDismiss'
import { useFloatingPosition } from '@/composables/useFloatingPosition'

/**
 * 样式页右键菜单浮层 = 原版 `$menu`（组件定义 `app.v4.js:278-433`，scoped `f59b9b2c`）。
 *
 * 为什么不用公共 `GMenu`：`GMenu` 的皮肤属于字体管理页（透明底 / 28px 行 / 半透明白 hover），
 * 而原版 `$menu` 是另一套（`#363636` 底 / 32px 行 / `#3565ff` hover / `hr` 分隔 / 100px 最小宽）。
 * 把两套皮肤塞进一个组件会让字体页跟着变样（`docs/规范/视觉规范.md` 的横向一致要求），
 * 所以这里按原版单独实现，`GMenu` 保持不动。
 */
const props = defineProps<{
  visible: boolean
  /** 原版直接拿 event 的 pageX/pageY 当左上角（`app.v4.js:452-465`） */
  x: number
  y: number
  items: StyleMenuEntry[]
}>()

const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

function close() {
  emit('update:visible', false)
}

const menuRef = ref<HTMLElement | null>(null)
const point = ref({ x: props.x, y: props.y })

// offset 给 0：原版就是"鼠标点即左上角"；padding 4 是原版那个 `u = 4` 的视口边距
const { update } = useFloatingPosition({
  reference: point,
  floating: menuRef,
  placement: 'bottom-start',
  offset: 0,
})

useDismiss(() => props.visible, menuRef, close)

// 依赖 x/y 而不只依赖 visible：菜单开着时右键另一项，原版会原地换内容（`:408-418`）
watch(
  () => (props.visible ? [props.x, props.y] : null),
  async (next) => {
    if (!next) return
    point.value = { x: props.x, y: props.y }
    await nextTick()
    update()
  },
)

function pick(entry: StyleMenuEntry) {
  if (entry.disabled) return
  close()
  entry.action?.()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" ref="menuRef" class="style-menu" role="menu">
      <template v-for="(entry, index) in items" :key="index">
        <hr v-if="entry.separator" class="style-menu__hr" />
        <button
          v-else
          class="style-menu__item"
          :class="{ 'is-disabled': entry.disabled }"
          type="button"
          role="menuitem"
          :title="entry.title"
          :aria-disabled="entry.disabled ? 'true' : undefined"
          @click.stop="pick(entry)"
        >
          <Icon v-if="entry.icon" class="style-menu__icon" :name="entry.icon" size="sm" />
          <span class="style-menu__text">{{ entry.text }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
/* 原版 `.menu[data-v-f59b9b2c]{position:fixed;z-index:1101;min-width:100px;padding:5px 0;
   background:#363636;border:1px solid hsla(0,0%,100%,.1);border-radius:5px;
   box-shadow:0 4px 20px rgba(0,0,0,.4)}`。
   z-index：原版 1101 高于仓库下拉的 101；这里取 `--z-tooltip`（高于 `--z-dropdown`，仍低于 `--z-modal`）。 */
.style-menu {
  position: fixed;
  top: var(--floating-y, 0);
  left: var(--floating-x, 0);
  z-index: var(--z-tooltip);
  min-width: 100px;
  padding: var(--sp-exact-5) 0;
  border: 1px solid var(--c-border-float);
  border-radius: var(--r-input);
  background: var(--c-surface);
  box-shadow: var(--shadow-pop);
}

/* 原版 `.menu-item[data-v-f59b9b2c]{position:relative;height:32px;padding:0 15px}` */
.style-menu__item {
  display: flex;
  width: 100%;
  height: 32px;
  align-items: center;
  padding: 0 var(--sp-exact-15);
  border: 0;
  background: transparent;
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  text-align: left;
  cursor: default;
}

/* 原版 `.menu-item:hover{background:#3565ff}` */
.style-menu__item:hover {
  background: var(--c-accent-solid);
}

/* 原版 `.menu-svg{width:14px;height:14px;margin-right:8px;color:#fff}`（`showIcon` 时文字再 `.mr6`） */
.style-menu__icon {
  margin-right: var(--sp-4);
  color: var(--c-text-inverse);
}

/* 原版 `.menu-text{white-space:nowrap;color:#fff}` */
.style-menu__text {
  white-space: nowrap;
}

/* 原版 `.menu-hr{margin:5px 0;border:0;border-bottom:1px solid rgba(0,0,0,.15)}` */
.style-menu__hr {
  margin: var(--sp-exact-5) 0;
  border: 0;
  border-bottom: 1px solid var(--c-divider);
}

/* 有意偏离：原版 `$menu` 没有禁用态（项要么有回调要么是分隔线）。命令未实现的两项要"看得见但点不动" */
.style-menu__item.is-disabled {
  color: var(--text-dim);
  cursor: not-allowed;
}

.style-menu__item.is-disabled:hover {
  background: transparent;
}
</style>
