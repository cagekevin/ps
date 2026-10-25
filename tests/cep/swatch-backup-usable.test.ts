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

/**
 * 假 fs **挂在 `@/cep/node` 这一层** —— 写原语已搬到 `@/cep/disk-write`，
 * 挂在 `@/cep/fs-read` 上等于写路径完全没被拦（`disk-write` 走真 `nodeRequire('fs')`）。
 *
 * `userDir()` 必须以 `USER_DIR`（`/SheJiZhuLi`）**结尾** —— `swatch-repo.dataRoot()`
 * 靠 `slice(0, -USER_DIR.length)` 还原 `%APPDATA%`，不以它结尾会直接抛。
 */
vi.mock('@/cep/node', async () => {
  const pathMod = await import('node:path')
  const bufferMod = await import('node:buffer')
  const enoent = (p: string) => Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' })

  const fakeFs = () => ({
    mkdirSync: () => undefined,
    writeFileSync: (p: string, data: string | Uint8Array) => {
      fsMock.files.set(p, String(data))
    },
    renameSync: (from: string, to: string) => {
      const data = fsMock.files.get(from)
      if (data === undefined) throw enoent(from)
      fsMock.files.set(to, data)
      fsMock.files.delete(from)
    },
    unlinkSync: (p: string) => {
      if (!fsMock.files.has(p)) throw enoent(p)
      fsMock.files.delete(p)
    },
    readFileSync: (p: string) => {
      const data = fsMock.files.get(p)
      if (data === undefined) throw enoent(p)
      return data
    },
    readdirSync: () => [],
    // 故意**不提供** `existsSync`：实现若回退成"先判存在"，这里会立刻炸（T-108）
  })

  return {
    hasNode: () => true,
    nodeRequire: (id: string) =>
      id === 'fs'
        ? fakeFs()
        : id === 'path'
          ? pathMod.default
          : id === 'buffer'
            ? bufferMod
            : undefined,
    toPosix: (p: string) => p,
  }
})

vi.mock('@/cep/paths', () => ({
  // 以 `USER_DIR` 结尾，`dataRoot()` 才能还原出 `%APPDATA%`（= `/ROAM`）
  userDir: () => '/ROAM/SheJiZhuLi',
}))

vi.mock('@/cep/events', () => ({
  APP_EVENT_SEBAN: 'com.fengzi.event.seban',
  onAppEvent: () => () => {},
}))

const { writeSwatchItems } = await import('@/cep/data/swatch-repo')

// 色板文件在 `%APPDATA%/FengZiSeBan/` 下（`SWATCH_DIR`），不在 `USER_DIR` 里 ——
// 以前写成 `/user/userColor.ini`，与 `swatchFilePath()` 算出来的路径根本不是同一个文件。
const PATH = '/ROAM/FengZiSeBan/userColor.ini'
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
