import { CepError } from './errors'

/**
 * 把错误翻成人话，UI 层直接拿去 toast。页面里不要再各写各的文案。
 *
 * 只做"错误 → 文案"，**不依赖 store / feedback**：
 * 需要弹提示的地方用 `components/command/useCommand` 的 `run()`。
 */
export function describeCepError(e: unknown): string {
  if (e instanceof CepError) {
    switch (e.code) {
      case 'NO_CEP':
        return '当前不在 Photoshop 面板中运行'
      case 'NO_NODE':
        return 'Node 不可用，请检查 manifest 里的 --enable-nodejs'
      case 'TIMEOUT':
        return 'Photoshop 没有响应，请稍后重试'
      case 'NO_SELECTION':
        return e.message
      case 'INIT':
        return `Photoshop 脚本初始化失败：${e.message}`
      case 'NETWORK':
        return e.message
      default:
        return e.message
    }
  }
  return e instanceof Error ? e.message : String(e)
}
