import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** 是否出现在左侧导航 */
    nav?: boolean
    /** 固定在导航底部（设置这类） */
    bottom?: boolean
    /** 导航图标（sprite 名），没有就用 glyph 兜底 */
    icon?: string
    /** 导航上显示的单字 */
    glyph?: string
    /** 云端功能，暂缓实现 */
    deferred?: boolean
    /** 独立面板：隐藏左侧导航 */
    standalone?: boolean
  }
}

const Placeholder = () => import('@/pages/_placeholder/index.vue')
/** 自定义：框架生成（原版 Custom，app.v4.js:34774 `np()`） */
const CustomPage = () => import('@/pages/custom/index.vue')
/** 字体管理：我的字体列表 + 标签 + 预览（原版 font-manage.js） */
const FontManagePage = () => import('@/pages/fontManage/index.vue')
/** 常用：主体待实现 */
const CommonUsePage = () => import('@/pages/commonUse/index.vue')
/** 自由面板：独立 CEP 面板窗口 */
const FreePanelPage = () => import('@/pages/freePanel/index.vue')
/** 动作管理：仓库 → 分组 → 动作（原版 Action.js） */
const ActionPage = () => import('@/pages/action/index.vue')
/** 字体面板：翻译/拆分/生成按钮/字体属性/层级（原版 anon_56d7_L34996） */
const FontSetPage = () => import('@/pages/fontSet/index.vue')
/** 设置：先接云同步面板 */
const SetPage = () => import('@/pages/set/index.vue')
/** 重命名：表达式预设分组 + 批量重命名 + 图层颜色标记（原版 Rename.js） */
const RenamePage = () => import('@/pages/rename/index.vue')
/** 样式：仓库 + 颜色/渐变/字体/图层样式四库（原版 Style，app.v4.js:49616 `EC()`） */
const StylePage = () => import('@/pages/style/index.vue')

/**
 * 路由表对齐 BUILD-SPEC/11-组件树.md 的 15 条。
 * 顺序即左侧导航顺序（从常用到少用）。
 */
export const routes: RouteRecordRaw[] = [
  // 原版首页就是字体面板页（anon_56d7_L34996）
  { path: '/', redirect: '/fontSet' },

  // 顺序对齐原版导航配置：自定义 → 常用 → 字体面板 → 字体管理 → 样式 → 动作 → 重命名
  {
    path: '/custom',
    name: 'Custom',
    component: CustomPage,
    meta: { title: '自定义', nav: true, icon: 'icon-nav_zidingyikuangjia', glyph: '自' },
  },
  {
    path: '/commonUse',
    name: 'CommonUse',
    component: CommonUsePage,
    meta: { title: '常用', nav: true, icon: 'icon-nav_changyonggongneng', glyph: '常' },
  },
  {
    path: '/freePanel',
    name: 'FreePanel',
    component: FreePanelPage,
    meta: { title: '自由面板', standalone: true },
  },
  {
    path: '/fontSet',
    name: 'FontSet',
    component: FontSetPage,
    meta: { title: '字体', nav: true, icon: 'icon-nav_zitimianban', glyph: '字' },
  },
  {
    path: '/fontManage',
    name: 'FontManage',
    component: FontManagePage,
    meta: { title: '字体管理', nav: true, icon: 'icon-nav_zitiguanli', glyph: '管' },
  },
  {
    path: '/style',
    name: 'Style',
    component: StylePage,
    meta: { title: '样式', nav: true, icon: 'icon-nav_yangshiku', glyph: '样' },
  },
  {
    path: '/action',
    name: 'Action',
    component: ActionPage,
    meta: { title: '动作', nav: true, icon: 'icon-nav_dongzuoku', glyph: '动' },
  },
  {
    path: '/rename',
    name: 'Rename',
    component: RenamePage,
    meta: { title: '重命名', nav: true, icon: 'icon-nav_chongmingmingtuceng', glyph: '名' },
  },
  // @new-page
  {
    path: '/set',
    name: 'Set',
    component: SetPage,
    meta: { title: '设置', nav: true, bottom: true, icon: 'iconyonghushezhi', glyph: '设' },
  },

  // 云端内容，按计划不做。路由先留着，免得深链接白屏
  {
    path: '/template',
    name: 'Template',
    component: Placeholder,
    meta: { title: '模板', deferred: true },
  },
  {
    path: '/material',
    name: 'Material',
    component: Placeholder,
    meta: { title: '素材', deferred: true },
  },
  {
    path: '/topics/:type',
    name: 'TopicCenter',
    component: Placeholder,
    meta: { title: '专题', deferred: true },
  },
  {
    path: '/topic/:type/:id',
    name: 'TopicDetail',
    component: Placeholder,
    meta: { title: '专题详情', deferred: true },
  },

  // 开发用：原子组件预览，不进导航
  {
    path: '/__probe',
    name: 'Probe',
    component: () => import('@/pages/_probe/index.vue'),
  },
  {
    path: '/__atoms',
    name: 'Atoms',
    component: () => import('@/pages/_atoms/index.vue'),
    meta: { title: '原子组件' },
  },

  { path: '/:pathMatch(.*)*', redirect: '/fontSet' },
]

/** 左侧导航项 */
export const navRoutes = routes.filter((route) => route.meta?.nav && !route.meta.bottom)
/** 导航底部固定的项（设置） */
export const navBottomRoutes = routes.filter((route) => route.meta?.nav && route.meta.bottom)

export default createRouter({
  // CEP 走 file://，只能用 hash
  history: createWebHashHistory(),
  routes,
})
