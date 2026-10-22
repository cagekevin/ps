import { defineStore } from 'pinia'
import { computed } from 'vue'
import { usePersistedRef } from '@/composables/usePersisted'
import { navBottomRoutes, navRoutes } from '@/router'

export interface NavItem {
  path: string
  title: string
  icon?: string
  glyph?: string
  bottom: boolean
}

/**
 * 左侧栏导航配置。
 *
 * 路由仍是唯一来源；这里只持久化“隐藏了哪些”，不复制路由表。
 */
export const useNavStore = defineStore('nav', () => {
  const hidden = usePersistedRef<string[]>('nav.hidden', [])

  const allItems = computed<NavItem[]>(() => [
    ...navRoutes.map((route) => ({
      path: route.path,
      title: route.meta?.title ?? route.path,
      icon: route.meta?.icon,
      glyph: route.meta?.glyph,
      bottom: false,
    })),
    ...navBottomRoutes.map((route) => ({
      path: route.path,
      title: route.meta?.title ?? route.path,
      icon: route.meta?.icon,
      glyph: route.meta?.glyph,
      bottom: true,
    })),
  ])

  const topItems = computed(() =>
    allItems.value.filter((item) => !item.bottom && !hidden.value.includes(item.path)),
  )
  const bottomItems = computed(() =>
    allItems.value.filter((item) => item.bottom && !hidden.value.includes(item.path)),
  )

  function isHidden(path: string): boolean {
    return hidden.value.includes(path)
  }

  function setVisible(path: string, visible: boolean) {
    if (visible) {
      hidden.value = hidden.value.filter((item) => item !== path)
      return
    }
    // 至少保留一个顶部入口，否则用户无法再回到设置
    const remainingTop = topItems.value.filter((item) => item.path !== path)
    if (!remainingTop.length && !allItems.value.find((item) => item.path === path)?.bottom) return
    if (!hidden.value.includes(path)) hidden.value = [...hidden.value, path]
  }

  function reset() {
    hidden.value = []
  }

  return { hidden, allItems, topItems, bottomItems, isHidden, setVisible, reset }
})
