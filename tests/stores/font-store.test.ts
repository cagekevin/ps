import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FontTag } from '@/cep/types'

/**
 * P4b 之后 store 是**只读投影**：写操作在 commands/font.ts。
 * 这个文件只验"读 + 缓存 + 订阅刷新 + 预览档位"。
 *
 * 读原语的位置：标签/星级在 `@/cep/data/font-meta`（store 不再经 `@/cep/ps`）。
 */
const meta = vi.hoisted(() => ({
  readFontTags: vi.fn(),
  readFontStars: vi.fn(),
}))

const repos = vi.hoisted(() => ({
  tags: { onChange: vi.fn() },
  stars: { onChange: vi.fn() },
}))

vi.mock('@/cep/data/font-meta', () => meta)
vi.mock('@/cep/data', () => ({
  tagsRepo: repos.tags,
  starsRepo: repos.stars,
  tagsWriter: repos.tags,
  starsWriter: repos.stars,
}))

const { useFontStore } = await import('@/stores/font')

const tag = (text: string, arr: string[] = []): FontTag => ({ text, arr, xz: false })

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
  meta.readFontTags.mockReturnValue([])
  meta.readFontStars.mockReturnValue({ ok: true, stars: {} })
  repos.tags.onChange.mockReturnValue(() => {})
  repos.stars.onChange.mockReturnValue(() => {})
})

describe('标签读取', () => {
  it('loadTags 成功填充，未强制时不重复请求', async () => {
    meta.readFontTags.mockReturnValue([tag('收藏')])
    const store = useFontStore()

    await store.loadTags()
    expect(store.tags).toHaveLength(1)

    await store.loadTags()
    expect(meta.readFontTags).toHaveBeenCalledTimes(1)
  })

  it('loadTags(true) 强制重读（仓库变更后的刷新路径）', async () => {
    meta.readFontTags.mockReturnValue([tag('收藏')])
    const store = useFontStore()

    await store.loadTags()
    await store.loadTags(true)
    expect(meta.readFontTags).toHaveBeenCalledTimes(2)
  })

  it('读取失败写进 tagsError，不抛', async () => {
    meta.readFontTags.mockRejectedValue(new Error('读不到文件'))
    const store = useFontStore()

    await store.loadTags()
    expect(store.tagsError).toBe('读不到文件')
  })

  it('重试成功会清掉上一次的 tagsError', async () => {
    meta.readFontTags.mockRejectedValueOnce(new Error('读不到文件'))
    meta.readFontTags.mockReturnValue([tag('收藏')])
    const store = useFontStore()

    await store.loadTags()
    expect(store.tagsError).toBe('读不到文件')

    await store.loadTags(true)
    expect(store.tagsError).toBe('')
    expect(store.tags).toHaveLength(1)
  })
})

describe('星级读取', () => {
  it('loadStars 填充映射', async () => {
    meta.readFontStars.mockReturnValue({ ok: true, stars: { MiSans: 3 } })
    const store = useFontStore()

    await store.loadStars()
    expect(store.stars.MiSans).toBe(3)
    expect(store.starsError).toBe('')
  })

  /**
   * TD-01-4：读不到时**不许**只留一个空映射就走。
   * 空映射在页面上等于"你还没收藏过"——那是用户的结论，不是我们的故障。
   */
  it('读不到星级：starsError 带原因，stars 为空但界面能说出"读不到"', async () => {
    meta.readFontStars.mockReturnValue({ ok: false, stars: {}, reason: 'EPERM: 拒绝访问' })
    const store = useFontStore()

    await store.loadStars()
    expect(store.stars).toEqual({})
    expect(store.starsError).toContain('读取不到星级文件')
    expect(store.starsError).toContain('EPERM')
  })

  it('读取抛错也不外抛，同样落到 starsError', async () => {
    meta.readFontStars.mockRejectedValue(new Error('权限不足'))
    const store = useFontStore()

    await store.loadStars()
    expect(store.stars).toEqual({})
    expect(store.starsError).toContain('权限不足')
  })
})

describe('预览档位', () => {
  it('cyclePreview 从最后一档回到第一档', () => {
    const store = useFontStore()
    store.previewMode = 'extra-large'
    store.cyclePreview()
    expect(store.previewMode).toBe('none')
  })
})

describe('只读投影', () => {
  it('store 不再暴露任何写方法（写只能在 commands）', () => {
    const store = useFontStore() as unknown as Record<string, unknown>
    for (const name of ['rate', 'apply', 'createTag', 'renameTag', 'deleteTag', 'toggleTag']) {
      expect(name in store).toBe(false)
    }
  })
})

describe('数据变更订阅（放最后：bindFontData 只生效一次）', () => {
  it('注册两个 onChange，触发标签变更后强制刷新', async () => {
    const { bindFontData } = await import('@/stores/font')
    bindFontData()

    expect(repos.tags.onChange).toHaveBeenCalledTimes(1)
    expect(repos.stars.onChange).toHaveBeenCalledTimes(1)

    meta.readFontTags.mockReturnValue([tag('新标签')])
    const store = useFontStore()

    const onChange = repos.tags.onChange.mock.calls[0][0] as () => void
    onChange()

    await vi.waitFor(() => {
      expect(store.tags.map((item) => item.text)).toEqual(['新标签'])
    })
    expect(meta.readFontTags).toHaveBeenCalledTimes(1)
  })
})
