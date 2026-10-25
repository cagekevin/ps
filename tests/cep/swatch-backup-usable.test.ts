import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TD-09-21：`.bak` 必须是**可读的上一版**，不是"被覆盖前的磁盘字节"。
 *
 * 旧语义只保证"原文进过 .bak"：原文自己坏了（写一半 / 乱码）时，`.bak` 存的就是坏的 ——
 * 回滚看起来成功，打开还是坏，等于没有退路。这条用例钉住色板这条**可达**路径：
 * 坏原文不许顶着 `.bak` 这个名字，改存 `<文件>.corrupt-<ts>`（字节一个不丢）。
 */
const fsMock = vi.hoisted(() => ({
  files: new Map<string, string>(),
}))

vi.mock('@/cep/fs-read', () => ({
  USER_DIR: '/SheJiZhuLi',
  readTextOutcome: async (p: string) => {
      const text = fsMock.files.get(p)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  readTextSync: (p: string) => {
      const text = fsMock.files.get(p)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  writeTextFile: (p: string, text: string) => {
      fsMock.files.set(p, text)
    },
  writeTextFileAtomic: (p: string, text: string) => {
      fsMock.files.set(p, text)
      return { status: 'ok' as const }
    },
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => '/user',
}))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

vi.mock('@/cep/events', () => ({
  APP_EVENT_SEBAN: 'com.fengzi.event.seban',
  onAppEvent: () => () => {},
}))

const { writeSwatchItems } = await import('@/cep/data/swatch-repo')

const PATH = '/user/userColor.ini'
const baks = () => [...fsMock.files.keys()].filter((k) => k.endsWith('.bak'))
const corrupts = () => [...fsMock.files.keys()].filter((k) => k.includes('.corrupt-'))

beforeEach(() => {
  fsMock.files.clear()
})

describe('色板写盘 · 备份可用性（TD-09-21）', () => {
  it('原文可用 → `.bak` 内容就是原文（真能拿来恢复）', async () => {
    const previous = JSON.stringify([{ name: '红', color: { hex: 'FF0000' } }])
    fsMock.files.set(PATH, previous)

    await writeSwatchItems(PATH, [{ name: '蓝', color: { hex: '0000FF' } }])

    expect(baks()).toEqual([`${PATH}.bak`])
    expect(fsMock.files.get(`${PATH}.bak`)).toBe(previous)
    expect(JSON.parse(fsMock.files.get(PATH) as string)).toEqual([
      { name: '蓝', color: { hex: '0000FF' } },
    ])
  })

  it('原文坏（半截 JSON）→ 不写 `.bak`，改存 `.corrupt-*` 且字节不丢', async () => {
    const broken = '[{"name":"红","color":{"he'
    fsMock.files.set(PATH, broken)

    await writeSwatchItems(PATH, [{ name: '蓝', color: { hex: '0000FF' } }])

    // 关键断言：坏内容绝不顶 `.bak`（否则"有备份"是假的）
    expect(baks()).toEqual([])
    expect(corrupts()).toHaveLength(1)
    expect(fsMock.files.get(corrupts()[0])).toBe(broken)
    // 新内容照常落盘（导入/发送不能被一个坏原文永久卡死）
    expect(JSON.parse(fsMock.files.get(PATH) as string)).toEqual([
      { name: '蓝', color: { hex: '0000FF' } },
    ])
  })

  it('原文是"合法 JSON 但不是色板形态"（`123`）→ 同样不写 `.bak`', async () => {
    fsMock.files.set(PATH, '123')

    await writeSwatchItems(PATH, [])

    expect(baks()).toEqual([])
    expect(corrupts()).toHaveLength(1)
  })

  it('原来没有文件（notSeen）→ 不产生 `.bak`、也不产生 `.corrupt-*`', async () => {
    await writeSwatchItems(PATH, [])

    expect(baks()).toEqual([])
    expect(corrupts()).toEqual([])
  })
})
