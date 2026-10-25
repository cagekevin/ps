import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 读边界 P0：**坏形状不许当数据**（TD-03-5 / T-99-2）。
 *
 * 为什么这 5 条必须有：`Decoder<T>` 只能保证"传了 decode"，**保证不了 decode 真的在校验**
 * —— 后面的人完全可以把它改成 `(raw) => ({ value: raw as T })` 或 `isFoo = isRecord`，
 * 类型层一点都不会红。能拦住这件事的只有用例。
 *
 * 每条都**双向**断言：
 * - 坏形状 → `ok:false` + reason（判据不许放行）
 * - 好形状 → `ok:true`（判据不许"永远返回 null"也算通过）
 *
 * 覆盖的是 `tests/domain/decode.test.ts` 没覆盖的那 4 个数据层判据 + `toCategoryTags`。
 */

const state = vi.hoisted(() => ({ files: new Map<string, string>() }))

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => '/user',
}))

vi.mock('@/cep/fs-read', () => ({
  readTextSmart: async (path: string) => state.files.get(path) ?? null,
  readTextOutcome: async (path: string) => {
      const text = state.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  readTextSync: (path: string) => {
      const text = state.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  writeTextFile: (path: string, text: string) => {
      state.files.set(path, text)
    },
  writeTextFileAtomic: (path: string, text: string) => {
      state.files.set(path, text)
      return true
    },
}))

const { DATA_FILES } = await import('@/cep/env')
const { starsRepo, tagsRepo } = await import('@/cep/data/index')
const { fontHistoryRepo } = await import('@/cep/data/font-extra')
const { legacySettingsRepo } = await import('@/cep/data/legacy-settings')
const { toCategoryTags } = await import('@/domain/classification')

const at = (name: string) => `/user/${name}`

beforeEach(() => {
  state.files.clear()
})

describe('读边界：坏形状 → ok:false（数据层 4 个判据）', () => {
  it('tags：数组里混进非对象 → 整份 ok:false；根不是数组也 ok:false；全对象 → ok:true', async () => {
    // 必须喂"数组里混非对象"：只喂根不是数组的话，条目谓词改成恒真也照样绿（探针验过）
    state.files.set(at(DATA_FILES.ztglTags), '[{"text":"标签"},42]')
    const badItem = await tagsRepo.read()
    expect(badItem.ok).toBe(false)
    expect(badItem.ok === false ? badItem.reason : '').toBe('内容结构不认识')

    state.files.set(at(DATA_FILES.ztglTags), '{"a":1}')
    expect((await tagsRepo.read()).ok).toBe(false)

    state.files.set(at(DATA_FILES.ztglTags), '[{"text":"标签"}]')
    expect((await tagsRepo.read()).ok).toBe(true)
  })

  it('stars：数组里混进非对象 → 整份 ok:false；全对象 → ok:true', async () => {
    state.files.set(at(DATA_FILES.ztglStar), '[{"name":"MiSans"},42]')
    const bad = await starsRepo.read()
    expect(bad.ok).toBe(false)
    expect(bad.ok === false ? bad.reason : '').toBe('内容结构不认识')

    state.files.set(at(DATA_FILES.ztglStar), '[{"name":"MiSans","star":3}]')
    expect((await starsRepo.read()).ok).toBe(true)
  })

  it('字体历史：混进非字符串 → 整份 ok:false；全字符串 → ok:true', async () => {
    state.files.set(at(DATA_FILES.ztglHistory), '["MiSans",1]')
    const bad = await fontHistoryRepo.read()
    expect(bad.ok).toBe(false)
    expect(bad.ok === false ? bad.reason : '').toBe('内容结构不认识')

    state.files.set(at(DATA_FILES.ztglHistory), '["MiSans"]')
    expect((await fontHistoryRepo.read()).ok).toBe(true)
  })

  it('设置文件：根不是对象 → ok:false；是对象 → ok:true', async () => {
    state.files.set(at(DATA_FILES.ztSet), '[1,2]')
    const bad = await legacySettingsRepo.read()
    expect(bad.ok).toBe(false)
    expect(bad.ok === false ? bad.reason : '').toBe('内容结构不认识')

    state.files.set(at(DATA_FILES.ztSet), '{"cyAutoFillColor":true}')
    expect((await legacySettingsRepo.read()).ok).toBe(true)
  })
})

describe('toCategoryTags（域级条目证明）', () => {
  it('缺 id / category 的条目被丢弃，合法条目逐字段带出', () => {
    expect(
      toCategoryTags([{ id: 1, category: 'c', name: 'n', repeat: 3 }, { id: 'x' }, 42]),
    ).toEqual([{ id: 1, category: 'c', name: 'n', repeat: 3 }])
  })

  it('全非法 → 空数组（不是 null：tags 为空是合法状态）', () => {
    expect(toCategoryTags([{ category: 'c' }, null])).toEqual([])
  })
})
