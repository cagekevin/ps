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
  /** 等够了、也没法知道对面在干什么：只用于「本仓自己等一个宿主事件」这类读场景 */
  | 'TIMEOUT'
  /**
   * ExtendScript 没在时限内回包 —— **我们不等了，但 PS 侧可能仍在跑、也可能已经执行完**。
   *
   * 与 `TIMEOUT` 分开是因为它能承载的信息不同：`TIMEOUT` 说「没等到」，这条说「不知道做没做成」。
   * 文案不能断言"已执行"，也不能劝重试（写操作重试 = 重复执行），只能让用户先确认结果。
   */
  | 'TIMEOUT_UNKNOWN'
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
  /**
   * 用户自己取消（点了「取消」/ 在 PS 里放弃了操作）。
   *
   * **这不是失败**：注册表把它归一成 `CommandResult.ok === 'cancelled'`，`useCommand` 因此
   * 不弹失败提示。以前取消被写成 PARSE / NETWORK，用户点「取消」会收到一条"故障"（TD-12-22）。
   */
  | 'CANCELLED'

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
