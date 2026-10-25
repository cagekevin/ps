import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 设置页系统命令（T-50）：`system.manualCopyShortcut` / `system.copyToScripts` / `system.resetQuickKeys`。
 *
 * 覆盖三条路径（写成功 / Node 不可用或路径解析不出 / 写失败）：
 * 1. 写成功：文件名与模板必须与原版一致（`08-设置.md:349-350`）；
 * 2. 解析不出 `Presets/Scripts` 必须**报错**，不许静默成功；
 * 3. 写失败（无 Node / 权限不足）必须有明确文案，不许吞掉。
 */
const fsMock = vi.hoisted(() => ({
  files: new Map<string, string>(),
  failWrite: false,
  hasNode: true,
  scriptsDir: 'PS/Presets/Scripts' as string | null,
}))

vi.mock('@/cep/node', () => ({
  hasNode: () => fsMock.hasNode,
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => 'ROAM/SheJiZhuLi',
  psScriptsDir: async () => fsMock.scriptsDir,
  extensionDir: () => '',
}))

vi.mock('@/cep/fs-read', () => ({
  writeTextFile: (path: string, text: string) => {
      if (!fsMock.hasNode) throw new Error('Node 不可用')
      if (fsMock.failWrite) throw new Error('EACCES')
      fsMock.files.set(path, text)
    },
  readTextSync: () => ({ status: 'notSeen' as const }),
  // T-107：唯一读入口（三态）；这些用例不读文件，一律"查不到"  readTextOutcome: async () => ({ status: 'notSeen' as const }),
  readTextSmart: async () => ({ ok: true, data: null }),
  // 落盘走 `@/cep/disk-write` 的 `writeDiskSync` → 最终调 `writeTextFileAtomic`（原子写）  writeTextFileAtomic: (path: string, text: string) => {
      if (!fsMock.hasNode) throw new Error('Node 不可用')
      if (fsMock.failWrite) throw new Error('EACCES')
      fsMock.files.set(path, text)
      return { status: 'ok' as const }
    },
  // T-109：base64 读也走三态  readBase64Outcome: () => ({ status: 'notSeen' as const }),
  writeBase64File: () => ({ status: 'ok' as const }),
  removeFile: () => ({ ok: true as const }),
}))

vi.mock('@/cep/codec', () => ({
  b64ToUtf8: (b: string) => Buffer.from(b, 'base64').toString('utf8'),
  utf8ToB64: (t: string) => Buffer.from(t, 'utf8').toString('base64'),
}))

vi.mock('@/selection', () => {
  const selection = { hasSelection: true, typeNumber: 2 }
  return {
    refresh: async () => selection,
    current: () => selection,
    selectionRef: { value: selection },
  }
})

vi.mock('@/cep/jsx', () => ({
  jsx: { action: {}, font: {}, layer: {}, env: {}, rename: {}, style: {} },
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')

const GROUPS = ['左侧栏', '框架模板', '常用功能', '字体面板', '批量套版'] as const
const TEMPLATE = '#target photoshop;\r\nfunction init() {}\r\ninit();'

beforeEach(() => {
  fsMock.files.clear()
  fsMock.failWrite = false
  fsMock.hasNode = true
  fsMock.scriptsDir = 'PS/Presets/Scripts'
})

describe('system.manualCopyShortcut', () => {
  it('按组名生成 SJZL-*.jsx，模板与原版一致', async () => {
    const result = await execute('system.manualCopyShortcut', { groups: [...GROUPS] })
    expect(result.ok).toBe(true)
    expect([...fsMock.files.keys()]).toEqual([
      'ROAM/SheJiZhuLi/快捷键脚本/SJZL-左侧栏.jsx',
      'ROAM/SheJiZhuLi/快捷键脚本/SJZL-框架模板.jsx',
      'ROAM/SheJiZhuLi/快捷键脚本/SJZL-常用功能.jsx',
      'ROAM/SheJiZhuLi/快捷键脚本/SJZL-字体面板.jsx',
      'ROAM/SheJiZhuLi/快捷键脚本/SJZL-批量套版.jsx',
    ])
    expect(fsMock.files.get('ROAM/SheJiZhuLi/快捷键脚本/SJZL-左侧栏.jsx')).toBe(TEMPLATE)
  })

  it('Node 不可用时报错并给出人工拷贝提示', async () => {
    fsMock.hasNode = false
    const result = await execute('system.manualCopyShortcut', { groups: [...GROUPS] })
    expect(result.ok).toBe(false)
    expect(fsMock.files.size).toBe(0)
  })

  it('写失败时报错，不吞异常', async () => {
    fsMock.failWrite = true
    const result = await execute('system.manualCopyShortcut', { groups: [...GROUPS] })
    expect(result.ok).toBe(false)
  })
})

describe('system.copyToScripts', () => {
  it('解析出目录时写到 Presets/Scripts', async () => {
    const result = await execute('system.copyToScripts', { groups: [...GROUPS] })
    expect(result.ok).toBe(true)
    expect(fsMock.files.has('PS/Presets/Scripts/快捷键脚本/SJZL-批量套版.jsx')).toBe(true)
  })

  it('解析不出脚本目录时报错，不静默成功', async () => {
    fsMock.scriptsDir = null
    const result = await execute('system.copyToScripts', { groups: [...GROUPS] })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('脚本目录')
    expect(fsMock.files.size).toBe(0)
  })

  it('写失败时报错', async () => {
    fsMock.failWrite = true
    const result = await execute('system.copyToScripts', { groups: [...GROUPS] })
    expect(result.ok).toBe(false)
  })
})

describe('system.resetQuickKeys', () => {
  it('刷新成功，不写任何文件', async () => {
    const result = await execute('system.resetQuickKeys', { groups: [...GROUPS] })
    expect(result.ok).toBe(true)
    expect(fsMock.files.size).toBe(0)
  })
})
