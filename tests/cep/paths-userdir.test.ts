import { createRequire } from 'node:module'
import { mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { installFakeCepBridge, type FakeCepBridgeHandle } from '../helpers/fake-cep-bridge'
import { installHostRequire } from '../helpers/host-stub'
import { getBridge } from '@/cep/host'
import { toPosix } from '@/cep/node'
import { appDataRoot, extensionDir, toLocalPath, userDir } from '@/cep/paths'
import { CepError } from '@/utils/errors'

/**
 * `userDir()` 的三个分支 —— 这一条是本轮路径 bug 的**唯一凭证**。
 *
 * 为什么必须单开一个文件、必须假桥：`vite build` 的 definePlugin 把
 * `globalThis.process.env` 换成 `{}`（`node_modules/vite/dist/node/chunks/config.js:26682`），
 * 而 vitest 不跑 define ⇒ **单测里 `process.env.APPDATA` 永远是真的**，第 ② 段永远正确、
 * 第 ① 段永远走不到。不假桥的话，"宿主优先"这段代码在测试里是死的，本 bug 可以原地复发。
 *
 * 假桥算不算撞 ADR-0024？不算：规则要求「mock 更外层」，`window.__adobe_cep__` 就是最外层
 * 第三方边界（等同 `fs` / `os`）；被测的 `userDir()` 本身仍是真实现。
 */

const realRequire = createRequire(import.meta.url)

// **必须在 import `@/cep/paths` 之前**把 APPDATA 指到临时目录。
// 原因：`paths` → `transport` → `logger` 在模块求值期就装上落盘口（`logger.ts:131`），
// 而 `log-file.load()` 会调 `readOwnFileText()` → `userDir()`；此刻还没有假桥 ⇒ 走平台公式
// ⇒ 用真 `%APPDATA%` ⇒ 测试会把 `sj_v5_log.txt` 写进**用户真实数据目录**（本轮实测发生过）。
// 指到临时目录后，这条副作用只落在临时目录，不碰用户数据。
const tmpAppData = mkdtempSync(join(tmpdir(), 'psz-userdir-'))
const originalAppData = process.env.APPDATA
process.env.APPDATA = tmpAppData

// **必须还原**：vitest 同一 worker 会连着跑多个测试文件，`process.env` 是进程级的。
// 不还原 = 把 `APPDATA` 泄漏给后面的文件，那些文件本来会写真实数据目录的问题会被**掩盖**。
afterAll(() => {
  if (originalAppData === undefined) delete process.env.APPDATA
  else process.env.APPDATA = originalAppData
})

// `nodeRequire('path' / 'os')` 要走真模块：jsdom 里没有 CEP 注入的 require。
// （为什么不是直接 `window.require = …`：`@types/node` 的全局 `require` 是 NodeRequire，
//   与 CEP 的裸函数合并成交集 ⇒ 编译不过。理由与那处唯一的转型都在 `tests/helpers/host-stub.ts`。）
installHostRequire((id: string) => realRequire(id))

let bridge: FakeCepBridgeHandle | null = null

afterEach(() => {
  bridge?.uninstall()
  bridge = null
})

describe('userDir() 的分支', () => {
  it('桥在 ⇒ 用宿主的 userData，且 decodeURI / 剥 file:// / 去尾斜杠都生效', () => {
    bridge = installFakeCepBridge({
      // 三个坑一起喂：file:// 前缀、编码过的空格、尾斜杠
      systemPaths: { userData: 'file:///C:/Users/x/AppData/Roaming/' },
    })
    bridge.install()

    expect(userDir()).toBe('C:/Users/x/AppData/Roaming/SheJiZhuLi')
  })

  it('桥在但拿不到根 ⇒ 抛 CepError(IO)，绝不静默落回平台公式', () => {
    bridge = installFakeCepBridge({ throwOn: ['userData'] })
    bridge.install()

    let caught: unknown
    try {
      userDir()
    } catch (e) {
      caught = e
    }

    // 抛 = 没落回平台公式；若落回，Windows 上会返回 homedir+Library 那个错目录而不抛
    expect(caught).toBeInstanceOf(CepError)
    expect(caught instanceof CepError && caught.code).toBe('IO')
  })

  it('桥返空串 ⇒ 同样抛，不返回 "<空>/SheJiZhuLi"', () => {
    bridge = installFakeCepBridge({ systemPaths: { userData: '' } })
    bridge.install()

    expect(() => userDir()).toThrow(CepError)
  })

  it('桥在但 getSystemPath 缺失 ⇒ 抛，不许静默落回平台公式（这是唯一会无声复发的态）', () => {
    bridge = installFakeCepBridge({ withoutGetSystemPath: true })
    bridge.install()

    let caught: unknown
    try {
      userDir()
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(CepError)
    expect(caught instanceof CepError && caught.code).toBe('IO')
  })

  it('桥返非字符串（undefined）⇒ 抛，不许拼出 "undefined/SheJiZhuLi"', () => {
    bridge = installFakeCepBridge({ rawUserData: undefined })
    bridge.install()

    let caught: unknown
    try {
      userDir()
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(CepError)
  })

  it('桥返畸形 URI ⇒ 抛 CepError，URIError 不许穿透', () => {
    bridge = installFakeCepBridge({ rawUserData: 'file:///C:/bad%zz/path' })
    bridge.install()

    let caught: unknown
    try {
      userDir()
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(CepError)
    expect(caught instanceof CepError && caught.code).toBe('IO')
  })

  it('无桥 ⇒ 走平台公式；Windows 上必须是 %APPDATA%，不许出现 macOS 那段', () => {
    expect(getBridge()).toBeUndefined()

    const ap = process.env.APPDATA
    expect(userDir().endsWith('/SheJiZhuLi')).toBe(true)

    if (ap) {
      expect(userDir()).toBe(`${toPosix(ap)}/SheJiZhuLi`)
      // 这一条就是本 bug 的红点：修前 Windows 上算出的是 homedir + /Library/Application Support
      expect(userDir()).not.toContain('/Library/Application Support')
    } else {
      // macOS：没有 APPDATA，只能靠 homedir + /Library/Application Support
      expect(userDir()).toBe(`${toPosix(homedir())}/Library/Application Support/SheJiZhuLi`)
    }
  })

  it('userDir() 就是 appDataRoot() + USER_DIR（不再各自反推根）', () => {
    bridge = installFakeCepBridge({ systemPaths: { userData: 'file:///R/' } })
    bridge.install()

    expect(appDataRoot()).toBe('/R')
    expect(userDir()).toBe(`${appDataRoot()}/SheJiZhuLi`)
  })
})

describe('extensionDir() 的失败形状', () => {
  it('无桥 ⇒ 抛 CepError(INIT)，不再返空串（返空串会被 action.ts:306 静默拼成 /preset/…）', () => {
    expect(getBridge()).toBeUndefined()

    let caught: unknown
    try {
      extensionDir()
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(CepError)
    expect(caught instanceof CepError && caught.code).toBe('INIT')
  })

  it('桥返 URI ⇒ 解码成路径；与 appDataRoot() 共用同一个 toLocalPath()', () => {
    bridge = installFakeCepBridge({ systemPaths: { extension: 'file:///ext/' } })
    bridge.install()

    expect(extensionDir()).toBe('/ext')
    expect(toLocalPath('file:///a%20b/')).toBe('/a b')
  })
})
