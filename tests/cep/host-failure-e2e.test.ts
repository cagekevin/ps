import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 假 PS 的三种宿主失败，各走一遍**真链路**：假桥 → 真 transport → 真 jsx 域 → 真 registry
 * → 真 logger（落盘）→ 关掉重开仍查得到。
 *
 * 判据只有一个：**失败之后还有谁能知道它发生过**。
 * 「用户能看见」= `CommandResult.reason`（`useCommand.run` 拿它 toast）/ `watchStateRef`（页面提示条下一轮接）；
 * 「日志有原因」= 落盘文件里能查到这条失败，且带得上 PS 侧给的原话。
 *
 * 三种失败对应 TD-13-2 / TD-13-4 / TD-13-5 的爆炸半径：
 * ① jsx 抛错（ERR: 通道）② 永不回包（超时）③ 事件通道根本挂不上（订阅失败）。
 */
const realRequire = createRequire(import.meta.url)

const disk = { files: new Map<string, string>() }

type Bridge = {
  evalScript: (script: string, cb: (res: string) => void) => void
  getSystemPath: (what: string) => string
}
const holder = window as unknown as { __adobe_cep__?: Bridge }

/** 假 PS：先答掉 ps.ts 的初始化脚本，其余交给 `answer`；返回 null 表示**永不回包** */
function installBridge(answer: (script: string) => string | null | undefined) {
  const scripts: string[] = []
  holder.__adobe_cep__ = {
    // ps.ts 的 doInit 要扩到目录才肯 evalFile；不给就等于 INIT 失败，测的就不是本轮那三条链了
    getSystemPath: (what) => (what === 'extension' ? '/ext' : '/user'),
    evalScript(script, cb) {
      scripts.push(script)
      if (script.includes('$.evalFile')) return cb('OK')
      if (script.includes('typeof ztgl_initSystemList')) return cb('function')
      if (script.includes('Layer_isSelectLayer')) return cb('true')
      if (script.includes('Layer_getTypeNumber')) return cb('2')
      const res = answer(script)
      if (res === null) return // 不回包：模拟 PS 侧卡住/崩溃
      cb(res ?? 'null')
    },
  }
  return scripts
}

function installRequire() {
  const fs = {
    mkdirSync: () => {},
    readFileSync: (p: string) => {
      const data = disk.files.get(p)
      if (data === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      return data
    },
    writeFileSync: (p: string, data: string) => {
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

/** 只挡掉命令层的数据仓库（与本轮失败链无关，避免把 fs/Node 全拖进来） */
vi.mock('@/cep/data', () => ({ starsRepo: {}, tagsRepo: {} }))
vi.mock('@/cep/data/actions', () => ({ actionIndexRepo: {}, actionLibraryRepo: {} }))
vi.mock('@/cep/data/free-panel', () => ({ freePanelRepo: {} }))
vi.mock('@/cep/data/settings', () => ({ settingsSnapshot: () => ({}) }))

const { userDir } = await import('@/cep/fs')
const logPath = () => `${userDir()}/sj_v5_log.txt`

async function bootPanel() {
  const logger = await import('@/utils/logger')
  const { createLogFileSink } = await import('@/cep/log-file')
  logger.attachLogSink(
    createLogFileSink((reason) => logger.log.warn('logger', '日志落盘失败', reason)),
  )
  return logger
}

/** 关掉重开：新模块实例 + 新落盘口，出口仍是 `log.dump()`（DebugLog 显示的就是它） */
async function reopenPanel() {
  vi.resetModules()
  const logger = await import('@/utils/logger')
  const { createLogFileSink } = await import('@/cep/log-file')
  logger.attachLogSink(createLogFileSink())
  return logger.log.dump()
}

beforeEach(() => {
  disk.files.clear()
  installRequire()
  vi.useFakeTimers()
  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
  delete holder.__adobe_cep__
  delete (window as unknown as { require?: unknown }).require
})

describe('假 PS 全链路：三类宿主失败', () => {
  it('jsx 抛错：用户拿到 PS 侧原话，日志关掉重开查得到', async () => {
    installBridge((script) => (script.includes('ztgl_setFont') ? 'ERR:没有选中图层' : undefined))
    await bootPanel()

    const { register, execute } = await import('@/commands/registry')
    register({
      id: 'e2e.write',
      title: '写字体',
      group: 'font',
      requires: 'none',
      kind: 'instant',
      async run(ctx) {
        await ctx.jsx.font.setFont('MiSans-Bold', 'MiSans', 'Bold')
      },
    })

    const result = await execute('e2e.write')

    // ① 用户能看见：`useCommand.run` 就是把 reason 弹出来
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.reason).toContain('没有选中图层')
      expect(result.code).toBe('JSX')
    }

    // ② 日志有原因（落盘 → 重开仍可查）
    vi.advanceTimersByTime(500)
    expect(disk.files.get(logPath()) ?? '').toContain('没有选中图层')
    expect(await reopenPanel()).toContain('e2e.write 失败')
  })

  it('超时：文案不许说「失败」也不许劝重试，日志留下「可能已执行」的不确定性', async () => {
    installBridge((script) => (script.includes('ztgl_setFont') ? null : undefined))
    await bootPanel()

    const { register, execute } = await import('@/commands/registry')
    register({
      id: 'e2e.timeout',
      title: '写字体（PS 不回答）',
      group: 'font',
      requires: 'none',
      kind: 'instant',
      async run(ctx) {
        await ctx.jsx.font.setFont('MiSans-Bold', 'MiSans', 'Bold')
      },
    })

    const pending = execute('e2e.timeout')
    await vi.advanceTimersByTimeAsync(20_001) // jsx/font.ts 的 WRITE 超时
    const result = await pending

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.reason).toContain('可能已经执行')
      expect(result.reason).toContain('请先确认结果')
      expect(result.reason).not.toMatch(/请重试|请稍后重试/)
      expect(result.code).toBe('TIMEOUT_UNKNOWN')
    }

    vi.advanceTimersByTime(500)
    const onDisk = disk.files.get(logPath()) ?? ''
    // 日志必须带得上 PS 侧那句原话（registry 把 error 一起记了）
    expect(onDisk).toContain('没有回包')
    expect((await reopenPanel()).length).toBeGreaterThan(0)
  })

  it('事件通道挂不上：degraded 可见 + 日志有原因，且不假装成功', async () => {
    // 只有 evalScript（能查选区），没有 addEventListener / getExtensionId = 事件永远收不到
    installBridge(() => undefined)
    await bootPanel()

    const selection = await import('@/selection')
    selection.__resetWatchForTest()
    await selection.startSelectionWatch()

    expect(selection.watchStateRef.value.status).toBe('degraded')
    expect(selection.watchStateRef.value.error).toContain('CEP 回调监听不可用')

    vi.advanceTimersByTime(500)
    const onDisk = disk.files.get(logPath()) ?? ''
    expect(onDisk).toContain('选区事件订阅失败')
    expect(onDisk).toContain('CEP 回调监听不可用')
    expect(await reopenPanel()).toContain('选区事件订阅失败')
  })
})
