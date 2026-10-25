import { describe, expect, it, vi } from 'vitest'

/**
 * TD-09-3 的接线：SysFont2.json 读不到时，`getFontList` 必须**抛错并带上原因**，
 * 而不是回一个空列表——空列表在页面上就是「没有找到匹配的字体」那句空态。
 */

const sys = vi.hoisted(() => ({ readSysFontFile: vi.fn() }))

// 取数入口在 `data/font-list.ts`，它经 `ps.ts` 的 `initJsx` 初始化：
// doInit 会问两个初始化脚本——evalFile 要 'OK'，typeof 要 'function'
vi.mock('@/cep/transport', () => ({
  hasCep: () => true,
  evalScriptRaw: async (script: string) =>
    script.includes('typeof ztgl_initSystemList') ? 'function' : 'OK',
}))
vi.mock('@/cep/paths', () => ({
  extensionDir: () => '/ext',
}))
vi.mock('@/cep/data/sys-font', () => ({
  readSysFontFile: sys.readSysFontFile,
  mergeFontStars: (list: unknown[]) => list,
}))
vi.mock('@/cep/jsx', () => ({
  jsx: {
    // 两臂：`'ok'` 是成功哨兵且**保留原值**（`font-list` 靠它判"去读 SysFont2.json"）
    font: { initSystemList: vi.fn(async () => ({ ok: true, data: 'ok' as const })) },
    env: { setEnv: async () => undefined },
  },
}))

const { getFontList } = await import('@/cep/data/font-list')

describe('getFontList 遇到读不到', () => {
  it('SysFont2.json 读不到 → 抛 IO 且带上原因（页面据此显示"读不到"）', async () => {
    sys.readSysFontFile.mockReturnValue({ status: 'error', reason: 'EACCES: 拒绝访问' })

    await expect(getFontList({ refresh: true })).rejects.toMatchObject({ code: 'IO' })
    await expect(getFontList({ refresh: true })).rejects.toThrow('读不到系统字体：EACCES')
  })

  it('文件不在 / 内容为空 → 抛 PARSE，同样不是空列表', async () => {
    sys.readSysFontFile.mockReturnValue({ status: 'none' })

    await expect(getFontList({ refresh: true })).rejects.toMatchObject({ code: 'PARSE' })
  })

  it('缓存命中时不再问 PS（读到且非空才算命中）', async () => {
    const cached = [{ family: 'MiSans', weights: [], names: [], postScriptNames: [], star: 0 }]
    sys.readSysFontFile.mockReturnValue({ status: 'ok', list: cached })

    await expect(getFontList()).resolves.toEqual(cached)
  })
})
