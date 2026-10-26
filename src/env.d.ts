/// <reference types="vite/client" />

/** 构建时注入的时间戳，见 vite.config.ts 的 define */
declare const __BUILD_TIME__: string
/** 构建时注入的 package.json version */
declare const __APP_VERSION__: string

/** CEP 注入到 window 的桥接对象，只声明我们真正用到的部分 */
interface CepBridge {
  evalScript(script: string, callback: (result: string) => void): void
  /**
   * 取系统路径。**只允许这两个名字**（收窄成字面量联合）：
   * `'extension'` 给 `extensionDir()`、`'userData'` 给 `userDir()`。
   * 收窄的理由：拼错（`'userdata'`）时 CEP 不报错、只回空串，收窄后编译期就红。
   * 返回的是 `file://` URI，不是路径 —— 调用方必须 `decodeURI` 再剥前缀（见 `paths.ts`）。
   */
  getSystemPath(name: 'extension' | 'userData'): string
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

/**
 * CEP 的 Node 侧文件对话框 API（CEP 文档化接口，只在 --enable-nodejs 下存在）。
 * 声明在这里而不是 `cep/dialog.ts`：`window.cep` 是**运行时注入**的第三方形状（ADR-0024）。
 */
interface CepFs {
  showOpenDialogEx(
    allowMultiple: boolean,
    chooseDirectory: boolean,
    title: string,
    initialPath: string,
    fileTypes: string[],
  ): { err: number; data: string[] }
  showSaveDialogEx(
    title: string,
    initialPath: string,
    fileTypes: string[],
    defaultName: string,
    friendlyFileTypes?: string,
  ): { err: number; data: string }
}

/**
 * CEP 的通用接口（`window.cep.util`）。声明在这里而不是 `cep/open-url.ts`：
 * 这是**运行时注入**的第三方形状（ADR-0024）。
 */
interface CepUtil {
  openURLInDefaultBrowser(url: string): void
}

interface Window {
  __adobe_cep__?: CepBridge
  /** 构建信息，启动自检写入；用于控制台/支持排查 */
  __PSZ_BUILD__?: { version: string; time: string }
  /** CEP 开了 --enable-nodejs 后可用 */
  require?: (id: string) => unknown
  cep_node?: { require: (id: string) => unknown }
  /** CEP 的 Node 侧 API（文件对话框在 `cep.fs`，外链在 `cep.util`） */
  cep?: { fs?: CepFs; util?: CepUtil }
  /** 日志导出的调试入口，由 `utils/logger.ts` 挂上去 */
  __pszDump?: () => string
  /**
   * JSONP 回调挂载点（`cep/http.ts` 的 `jsonp()`）：回调名运行时拼成 `__pszJsonp<base36><序号>`。
   *
   * 为什么是**模板字面量索引签名**而不是 `Record<string, unknown>` 转型（ADR-0024 第 1 步）：
   * 只放开这一个前缀，`window.任意拼写` 仍然过拼写检查；通用字符串索引签名会把全仓
   * `window.xxx` 的拼写错误一起放行，比一处转型更坏。写进 `.d.ts` 之后调用处一行转型都不用写。
   */
  [key: `__pszJsonp${string}`]: ((payload: unknown) => void) | undefined
}
