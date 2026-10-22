import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLoadingStore } from '@/stores/loading'

describe('loading store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('并发任务计数，全部结束才关闭', () => {
    const store = useLoadingStore()
    store.show('A')
    store.show('B')

    store.hide()
    expect(store.active).toBe(true)
    store.hide()
    expect(store.active).toBe(false)
  })

  it('run 抛错也会关闭', async () => {
    const store = useLoadingStore()
    await expect(
      store.run('任务', async () => {
        throw new Error('失败')
      }),
    ).rejects.toThrow('失败')
    expect(store.active).toBe(false)
  })
})
