/// <reference types="vite/client" />

/** 构建时注入的时间戳，见 vite.config.ts 的 define */
declare const __BUILD_TIME__: string
/** 构建时注入的 package.json version */
declare const __APP_VERSION__: string

/** CEP 注入到 window 的桥接对象，只声明我们真正用到的部分 */
interface CepBridge {
  evalScript(script: string, callback: (result: string) => void): void
  getSystemPath(name: string): string
  getOSInformation(): string
  /**
   * 扩展 ID。**注意大小写**：CEP 桥上是 `getExtensionId`（小写 d），
   * CSInterface 的 `getExtensionID()` 只是它的包装（原版 app.v4.js:69881-69883）。
   */
  getExtensionId(): string
  getHostEnvironment(): string
  /** 下面三个在旧版 CEP 可能不存在（用可选，调用处自己判） */
  /** 真实桥收的是 CSEvent **对象**，不是 JSON 字符串（CSInterface 也直接传对象） */
  dispatchEvent?(event: unknown): void
  addEventListener?(type: string, listener: (event: unknown) => void, obj?: unknown): void
  removeEventListener?(type: string, listener: (event: unknown) => void, obj?: unknown): void
}

interface Window {
  __adobe_cep__?: CepBridge
  /** 构建信息，启动自检写入；用于控制台/支持排查 */
  __PSZ_BUILD__?: { version: string; time: string }
  /** CEP 开了 --enable-nodejs 后可用 */
  require?: (id: string) => unknown
  cep_node?: { require: (id: string) => unknown }
}
