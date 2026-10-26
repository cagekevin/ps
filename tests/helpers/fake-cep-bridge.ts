// 是什么：测试用的**假 CEP 桥** —— 装到 `window.__adobe_cep__`，让真代码走真路径
//
// 替代了什么：4 处手写 `installBridge`（`host-failure-e2e` / `style-library-real-fs` /
//   `log-e2e-settings` / `events`）—— 那 4 处现在统一走 `tests/helpers/host-stub.ts` 的
//   `installHostBridge`（形状一样，但"装/卸/收尾"只在一处）。
// 谁在用：需要"在 CEP 里"的测试（当前只有 `tests/cep/paths-userdir.test.ts`）
// 禁止：用它替换**被测函数自己的依赖**（ADR-0024）—— 桥是最外层第三方边界（等同 `fs` / `os`），
//   只许假这一层；被测函数本身必须仍跑真实现。
//
// 收尾：装桥之后**每例之后必卸**（桩残留 ⇒ 下一个用例带着上一个的桩跑 ⇒ 假绿），
//   由本文件注册一次 `afterEach` ⇒ 调用方不用再写卸载的 `afterEach`。
import { afterEach, expect } from 'vitest'
import { getBridge } from '@/cep/host'
import { installHostBridge, removeHostBridge } from './host-stub'

/**
 * 假桥的开关。默认值刻意与 CEP 的"最坏真实行为"一致：`getSystemPath` 回空串、
 * `evalScript` 回空串 —— 于是忘了配哪一项，测试会以"拿到空路径"的方式红，而不是静默绿。
 */
export interface FakeCepBridgeOptions {
  /** `'extension'` / `'userData'` → 返回值。缺省 `''`（CEP 拿不到时的真实行为） */
  systemPaths?: Partial<Record<'extension' | 'userData', string>>
  /** 这些名字调用时抛（模拟宿主内部错误，用来验"不静默落回平台公式"） */
  throwOn?: readonly ('extension' | 'userData')[]
  /**
   * 让 `userData` 返回这个值（**原样**，不转字符串）。
   * 用来喂两种真实坏形状：`undefined`（老桥返空）与畸形 URI（`decodeURI` 抛 `URIError`）。
   */
  rawUserData?: unknown
  /** 干脆不提供 `getSystemPath`（模拟老 CEP / 桥被部分注入） */
  withoutGetSystemPath?: boolean
  /** 覆盖 `evalScript`；缺省一律回空串 */
  evalScript?: (script: string, callback: (result: string) => void) => void
}

export interface FakeCepBridgeHandle {
  /** 注入成"当前的桥"（覆盖已有值） */
  install(): void
  /** 卸注入（`getBridge()` 回到"不在 CEP 里"） */
  uninstall(): void
}

/** 建一个假桥（**不自动安装**，调 `install()` 才生效） */
export function installFakeCepBridge(options: FakeCepBridgeOptions = {}): FakeCepBridgeHandle {
  const paths = options.systemPaths ?? {}
  const throwOn = options.throwOn ?? []

  const bridge = {
    evalScript: (script: string, callback: (result: string) => void): void => {
      if (options.evalScript) options.evalScript(script, callback)
      else callback('')
    },
    getSystemPath: (name: 'extension' | 'userData'): string => {
      if (throwOn.includes(name)) throw new Error(`getSystemPath("${name}") 抛错（假桥）`)
      if (name === 'userData' && 'rawUserData' in options) {
        // 断言理由：这里**故意**回非字符串（`undefined`），模拟老桥的坏形状；
        // 桥的类型契约是 `string`，要喂坏形状只能在这一处越过它。
        return options.rawUserData as string
      }
      return paths[name] ?? ''
    },
    getOSInformation: (): string => 'Windows 10 64-bit',
    getExtensionId: (): string => 'com.local.psz.panel.v5',
    getHostEnvironment: (): string => '{}',
  }

  if (options.withoutGetSystemPath) {
    // 断言理由：模拟"桥在但方法缺失"（老 CEP / 桥被部分注入）。
    // `CepBridge` 把 `getSystemPath` 声明成必填，要造出这个坏形状只能在这一处删键。
    const mutable: { getSystemPath?: unknown } = bridge
    delete mutable.getSystemPath
  }

  // 收尾集中在这里：每例之后必卸 + 断言"桥没了"（一次注册，调用方不用写 afterEach）
  afterEach(() => {
    removeHostBridge()
    expect(getBridge()).toBeUndefined()
  })

  return {
    install() {
      installHostBridge(bridge)
    },
    uninstall() {
      removeHostBridge()
    },
  }
}
