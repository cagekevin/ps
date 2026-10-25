import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 全程一条真实失败：**原语 → 语义层 → 落点 → 出口**，并且**关掉重开之后**仍查得到。
 *
 * 用 `settings` 那条链（1a 修好的）：偏好读失败 → `settings.loadAll` 记一条
 * `log.error('settings', …)` → logger 落盘 → 重开后 `log.dump()`（`DebugLog` 显示的就是它）
 * 仍能看到 —— 这正是"用户报'刚才出错了'，我们能拿到证据"的最小闭环。
 *
 * 只 mock 掉 `hasCep`（让 settings 走 CEP 分支），`@/cep/fs` 与 logger/落盘都用**真实现**，
 * 底层是内存里的假 `node:fs`（要能注入 EACCES）。
 */
const realRequire = createRequire(import.meta.url)

const disk = { files: new Map<string, string>(), readError: '', writes: 0 }

vi.mock('@/cep/transport', () => ({ hasCep: () => true, evalScriptRaw: async () => '' }))

function installRequire() {
  const fs = {
    mkdirSync: () => {},
    readFileSync: (p: string) => {
      // 只让偏好文件读失败（日志文件本身要能读写，否则测的就不是同一条链）
      if (disk.readError && p.endsWith('sj_v5_ui.json')) {
        throw Object.assign(new Error(`${disk.readError}: 模拟读不到`), { code: disk.readError })
      }
      const data = disk.files.get(p)
      if (data === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      return data
    },
    writeFileSync: (p: string, data: string) => {
      disk.writes += 1
      disk.files.set(p, String(data))
    },
    renameSync: (from: string, to: string) => {
      const data = disk.files.get(from)
      if (data === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      disk.files.set(to, data)
      disk.files.delete(from)
    },
    unlinkSync: (p: string) => {
      disk.files.delete(p)
    },
    existsSync: (p: string) => disk.files.has(p),
  }
  const w = window as unknown as { require?: (id: string) => unknown }
  w.require = (id: string) => (id === 'fs' ? fs : realRequire(id))
}

const { userDir } = await import('@/cep/fs')
const logPath = () => `${userDir()}/sj_v5_log.txt`

beforeEach(() => {
  disk.files.clear()
  disk.readError = ''
  disk.writes = 0
  installRequire()
  vi.useFakeTimers()
  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
  delete (window as unknown as { require?: unknown }).require
  vi.resetModules()
})

describe('真实失败的全链条 · 关掉重开还能查到', () => {
  it('settings 读失败 → 日志落盘 → 重开后仍能 dump 到（DebugLog 的数据源）', async () => {
    // 1) 原语：读偏好文件 EACCES
    disk.readError = 'EACCES'

    // 落盘口：logger 在自己模块顶层就装好了（import logger 即装，无需调用）
    await import('@/cep/log-file')

    // 2) 语义层：真 settings（走 CEP 分支 → readTextSync 报 error → log.error）
    const settings = await import('@/cep/data/settings')
    settings.__resetSettingsForTest()
    expect(settings.getPref('font.previewText', 'default')).toBe('default')
    // 读失败之后写回必须被拒（1a 的 `refuseIfReadFailed`）——这条路会记一条 error
    settings.setPref('font.previewText', 'changed')
    settings.flushPrefs()

    // 3) 落点：flush 到"盘"上
    vi.advanceTimersByTime(500)
    const onDisk = disk.files.get(logPath()) ?? ''
    expect(onDisk).toContain('偏好写入失败')
    // 原因也必须留下来（Error 被序列化成 `{}` 就等于没记）
    expect(onDisk).toContain('偏好文件读不到')

    // 4) 面板重开：新模块实例 + 新落盘口，出口仍是 `log.dump()`（DebugLog 就显示这个）
    vi.resetModules()
    const rebooted = await import('@/utils/logger')
    await import('@/cep/log-file')

    const dumped = rebooted.log.dump()
    expect(dumped).toContain('偏好写入失败')
    expect(dumped).toContain('偏好文件读不到')
    expect(dumped).toContain('EACCES')
  })
})
