import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTaskStore } from '@/stores/tasks'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('长任务状态', () => {
  it('begin 加入队列，update 改对应项，end 移除', () => {
    const store = useTaskStore()

    const id = store.begin('播放动作')
    expect(store.tasks).toEqual([{ id, title: '播放动作' }])

    store.update(id, { progress: 0.5, detail: '第 3 / 10 个' })
    expect(store.tasks[0]).toMatchObject({ progress: 0.5, detail: '第 3 / 10 个' })

    store.end(id)
    expect(store.tasks).toHaveLength(0)
  })

  it('多任务互不影响，id 递增', () => {
    const store = useTaskStore()

    const first = store.begin('导出图片')
    const second = store.begin('优化文档')

    expect(second).toBeGreaterThan(first)
    store.end(first)
    expect(store.tasks.map((task) => task.title)).toEqual(['优化文档'])
  })

  it('update 未命中 id 时不影响其它任务', () => {
    const store = useTaskStore()
    store.begin('A')
    store.update(9999, { progress: 1 })
    expect(store.tasks[0].progress).toBeUndefined()
  })

  it('cancel 调用回调并从队列移除', () => {
    const store = useTaskStore()
    const id = store.begin('批量导出')
    let cancelled = false
    store.setCancel(id, () => {
      cancelled = true
    })

    store.cancel(id)

    expect(cancelled).toBe(true)
    expect(store.tasks).toHaveLength(0)
  })

  it('clear 清空全部', () => {
    const store = useTaskStore()
    store.begin('A')
    store.begin('B')
    store.clear()
    expect(store.tasks).toHaveLength(0)
  })
})
