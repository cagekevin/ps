/// <reference types="vite/client" />

/** 构建时注入的时间戳，见 vite.config.ts 的 define */
declare const __BUILD_TIME__: string

/** CEP 注入到 window 的桥接对象，只声明我们真正用到的部分 */
interface CepBridge {
  evalScript(script: string, callback: (result: string) => void): void
  getSystemPath(name: string): string
  getOSInformation(): string
  getExtensionID(): string
  getHostEnvironment(): string
}

interface Window {
  __adobe_cep__?: CepBridge
  /** CEP 开了 --enable-nodejs 后可用 */
  require?: (id: string) => unknown
  cep_node?: { require: (id: string) => unknown }
}
