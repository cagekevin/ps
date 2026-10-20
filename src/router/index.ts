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
  }
}

const Placeholder = () => import('@/pages/_placeholder/index.vue')
/** 字体管理：我的字体列表 + 标签 + 预览（原版 font-manage.js） */
const FontManagePage = () => import('@/pages/fontManage/index.vue')

/**
 * 路由表对齐 BUILD-SPEC/11-组件树.md 的 15 条。
 * 顺序即左侧导航顺序（从常用到少用）。
 */
export const routes: RouteRecordRaw[] = [
  // 原版首页是「字体面板页」(anon_56d7_L34996)，那页还没做，
  // 先落到字体管理，等字体页做完改回 /fontSet
  { path: '/', redirect: '/fontManage' },

  {
    path: '/fontSet',
    name: 'FontSet',
    component: Placeholder,
    meta: { title: '字体', nav: true, icon: 'icon-nav_zitimianban', glyph: '字' },
  },
  {
    path: '/commonUse',
    name: 'CommonUse',
    component: Placeholder,
    meta: { title: '常用', nav: true, icon: 'icon-nav_changyonggongneng', glyph: '常' },
  },
  {
    path: '/custom',
    name: 'Custom',
    component: Placeholder,
    meta: { title: '自定义', nav: true, icon: 'icon-nav_zidingyikuangjia', glyph: '自' },
  },
  {
    path: '/style',
    name: 'Style',
    component: Placeholder,
    meta: { title: '样式', nav: true, icon: 'icon-nav_yangshiku', glyph: '样' },
  },
  {
    path: '/action',
    name: 'Action',
    component: Placeholder,
    meta: { title: '动作', nav: true, icon: 'icon-nav_dongzuoku', glyph: '动' },
  },
  {
    path: '/rename',
    name: 'Rename',
    component: Placeholder,
    meta: { title: '重命名', nav: true, icon: 'icon-nav_chongmingmingtuceng', glyph: '名' },
  },
  {
    path: '/fontManage',
    name: 'FontManage',
    component: FontManagePage,
    meta: { title: '字体管理', nav: true, icon: 'icon-nav_zitiguanli', glyph: '管' },
  },
  {
    path: '/set',
    name: 'Set',
    component: Placeholder,
    meta: { title: '设置', nav: true, bottom: true, icon: 'iconyonghushezhi', glyph: '设' },
  },

  // 云端内容，按计划不做。路由先留着，免得深链接白屏
  { path: '/template', name: 'Template', component: Placeholder, meta: { title: '模板', deferred: true } },
  { path: '/material', name: 'Material', component: Placeholder, meta: { title: '素材', deferred: true } },
  { path: '/topics/:type', name: 'TopicCenter', component: Placeholder, meta: { title: '专题', deferred: true } },
  { path: '/topic/:type/:id', name: 'TopicDetail', component: Placeholder, meta: { title: '专题详情', deferred: true } },

  // 开发用：原子组件预览，不进导航
  { path: '/__atoms', name: 'Atoms', component: () => import('@/pages/_atoms/index.vue'), meta: { title: '原子组件' } },

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
