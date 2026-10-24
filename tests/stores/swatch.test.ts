import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/**
 * 色板只读投影（`stores/swatch.ts`）。
 *
 * 钉四件事：
 * 1. 三个文件都读得对（自定义色 / 最近色 / 上限）；
 * 2. **认不出的条目要如实报数**（`degraded`），不许静默丢——"我存了 16 条怎么少一条"查不出来；
 * 3. 一个文件读坏不许把另一个也拖成空；两个都坏才是整页 `error`；
 * 4. **唯一订阅点**真的会重读：本地写（`onChange`）与外部写（app event）两条来源都接上。
 */
const fsMock = vi.hoisted(() => ({ files: new Map<string, string>() }))

vi.mock('@/cep/fs', () => ({
  hasNode: () => true,
  userDir: () => 'ROAM/SheJiZhuLi',
  readTextOutcome: async (path: string) => {
    const text = fsMock.files.get(path)
    return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
  },
  readTextSync: (path: string) => {
    const text = fsMock.files.get(path)
    return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
  },
  writeTextFileAtomic: (path: string, text: string) => {
    fsMock.files.set(path, text)
    return true
  },
  writeTextFile: (path: string, text: string) => {
    fsMock.files.set(path, text)
  },
  readBase64Outcome: (path: string) => {
    const text = fsMock.files.get(path)
    return text === undefined
      ? { status: 'notSeen' as const }
      : { status: 'ok' as const, base64: Buffer.from(text).toString('base64') }
  },
  writeBase64File: (path: string, base64: string) => {
    fsMock.files.set(path, Buffer.from(base64, 'base64').toString('utf8'))
    return true
  },
  removeFile: (path: string) => {
    fsMock.files.delete(path)
    return { ok: true as const }
  },
  b64ToUtf8: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
  utf8ToB64: (text: string) => Buffer.from(text, 'utf8').toString('base64'),
}))

/** 把 `onAppEvent` 换成可手动触发的表（真实桥在 jsdom 里不存在） */
const appEvents = vi.hoisted(() => ({ handlers: [] as Array<(data: unknown) => void> }))
vi.mock('@/cep/events', () => ({
  APP_EVENT_SEBAN: 'com.fengzi.event.seban',
  onAppEvent: (_channel: string, handler: (data: unknown) => void) => {
    appEvents.handlers.push(handler)
    return () => {
      const index = appEvents.handlers.indexOf(handler)
      if (index >= 0) appEvents.handlers.splice(index, 1)
    }
  },
}))

const { useSwatchStore, bindSwatchData } = await import('@/stores/swatch')
const { appendCustomItem } = await import('@/cep/data/swatch-repo')

const CUSTOM = 'ROAM/FengZiSeBan/userColor.ini'
const RECENT = 'ROAM/FengZiSeBan/vecently.ini'
const LIMIT = 'ROAM/FengZiSeBan/zuiJinShuLiang.txt'

const RED = { name: '未命名', color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 } }
const BLUE = { name: '未命名', color: { hex: '0000FF', c: 100, m: 100, y: 0, k: 0 } }

/** 让 `void load()` 跑完：三次读都是同步 resolve 的 Promise，两个宏任务足够 */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
  setActivePinia(createPinia())
  fsMock.files.clear()
})

describe('load：三个文件各自的投影', () => {
  it('自定义色 / 最近色 / 上限都读出来，色块拼成 #hex', async () => {
    fsMock.files.set(CUSTOM, JSON.stringify([RED, BLUE]))
    fsMock.files.set(RECENT, JSON.stringify([BLUE]))
    fsMock.files.set(LIMIT, '7')

    const store = useSwatchStore()
    await store.load()

    expect(store.custom.map((item) => item.color.hex)).toEqual(['FF0000', '0000FF'])
    expect(store.customSwatches).toEqual(['#FF0000', '#0000FF'])
    expect(store.recent.map((item) => item.color.hex)).toEqual(['0000FF'])
    expect(store.recentLimit).toBe(7)
    expect(store.error).toBe('')
    expect(store.degraded).toBe('')
  })

  it('文件都不存在 = 空色板 + 默认上限，且**不是**错误（首次使用是正常状态）', async () => {
    const store = useSwatchStore()
    await store.load()

    expect(store.custom).toEqual([])
    expect(store.recent).toEqual([])
    expect(store.recentLimit).toBe(10)
    expect(store.error).toBe('')
  })

  it('认不出的条目如实报数（degraded），不静默丢', async () => {
    fsMock.files.set(
      CUSTOM,
      JSON.stringify([RED, { name: '没有 color' }, { name: '坏 hex', color: { hex: 'zzz' } }]),
    )

    const store = useSwatchStore()
    await store.load()

    expect(store.custom).toHaveLength(1)
    expect(store.degraded).toContain('2 条认不出')
  })

  it('自定义色读坏 → 最近色照常显示，degraded 说清是哪个文件', async () => {
    fsMock.files.set(CUSTOM, '{坏掉的')
    fsMock.files.set(RECENT, JSON.stringify([RED]))

    const store = useSwatchStore()
    await store.load()

    expect(store.custom).toEqual([])
    expect(store.recent.map((item) => item.color.hex)).toEqual(['FF0000'])
    expect(store.degraded).toContain('自定义色读取失败')
    // 只坏一个不算整页失败
    expect(store.error).toBe('')
  })

  it('两个数据文件都读坏 → error 非空（页面显示内联错误 + 重试）', async () => {
    fsMock.files.set(CUSTOM, '{坏掉的')
    fsMock.files.set(RECENT, '不是数组')

    const store = useSwatchStore()
    await store.load()

    expect(store.error).not.toBe('')
    expect(store.loading).toBe(false)
  })
})

describe('bindSwatchData：唯一订阅点（本地写 + app event 两条来源）', () => {
  it('绑定后：本地写文件 → 投影自动重读', async () => {
    bindSwatchData()
    const store = useSwatchStore()
    await store.load()
    expect(store.custom).toEqual([])

    await appendCustomItem(RED)
    await flush()

    expect(store.custom.map((item) => item.color.hex)).toEqual(['FF0000'])
  })

  it('绑定后：收到 app event（别处写盘）→ 重读，不看消息体内容', async () => {
    const store = useSwatchStore()
    await store.load()
    expect(store.custom).toEqual([])

    // 模拟主面板 / 官方色板面板写完文件后发的通知
    fsMock.files.set(CUSTOM, JSON.stringify([BLUE]))
    for (const handler of appEvents.handlers) handler('GengXin')
    await flush()

    expect(store.custom.map((item) => item.color.hex)).toEqual(['0000FF'])
  })
})
