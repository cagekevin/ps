/**
 * CEP 错误类型。**零依赖**。
 *
 * 为什么单独一个文件：`cep/transport` 与 `utils/error-text` 都要用它。
 * 若把 CepError 留在 transport 里，文案层就要 import cep/，工具层反成上层；
 * 若把文案留在 transport 里，传输层就拥有了产品文案。两边都不该。
 */

export type CepErrorCode =
  | 'NO_CEP'
  | 'NO_NODE'
  | 'TIMEOUT'
  | 'JSX'
  | 'PARSE'
  | 'INIT'
  /** 本地文件读写失败 */
  | 'IO'
  /** 外部网络（翻译等）：连接失败 / 服务端返回不可用 */
  | 'NETWORK'
  /** 没有选中图层 / 选中的不是文字图层 */
  | 'NO_SELECTION'
  /** 字体缺失，页面需要弹下载确认；命令层不直接 toast */
  | 'FONT_MISSING'

/** jsx 侧统一用这个前缀回传异常，见 cep/transport 里的包装 */
export const ERR_PREFIX = 'ERR:'

export class CepError extends Error {
  readonly code: CepErrorCode

  constructor(code: CepErrorCode, message: string) {
    super(message)
    this.name = 'CepError'
    this.code = code
  }
}
