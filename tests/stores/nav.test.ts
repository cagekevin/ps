import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNavStore } from '@/stores/nav'
import { __resetSettingsForTest } from '@/cep/data/settings'

describe('nav store', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetSettingsForTest()
    setActivePinia(createPinia())
  })

  it('隐藏后从导航移除，再显示恢复', () => {
    const store = useNavStore()
    const path = store.topItems[0].path
    const before = store.topItems.length

    store.setVisible(path, false)
    expect(store.isHidden(path)).toBe(true)
    expect(store.topItems).toHaveLength(before - 1)

    store.setVisible(path, true)
    expect(store.isHidden(path)).toBe(false)
    expect(store.topItems).toHaveLength(before)
  })

  it('不允许隐藏最后一个顶部入口', () => {
    const store = useNavStore()
    for (const item of [...store.topItems]) store.setVisible(item.path, false)

    expect(store.topItems).toHaveLength(1)
  })
})
