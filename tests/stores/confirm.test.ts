import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConfirmStore } from '@/stores/confirm'

describe('confirm store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('确认返回 true 并关闭', async () => {
    const store = useConfirmStore()
    const result = store.confirm({ message: '继续吗' })

    expect(store.visible).toBe(true)
    store.resolve(true)

    await expect(result).resolves.toBe(true)
    expect(store.visible).toBe(false)
  })

  it('再次 confirm 会把上一次按取消结束', async () => {
    const store = useConfirmStore()
    const first = store.confirm({ message: '第一次' })
    const second = store.confirm({ message: '第二次' })

    await expect(first).resolves.toBe(false)
    store.resolve(false)
    await expect(second).resolves.toBe(false)
  })
})
