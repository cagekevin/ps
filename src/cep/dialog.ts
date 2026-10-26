import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'

/**
 * CEP 文件对话框。
 *
 * 原版 `D.a.saveFile / openFile` 走 `window.cep.fs.showSaveDialogEx / showOpenDialogEx`
 * （app.v4.js:2465528 附近），不是 ExtendScript File。
 * `CepFs` 的形状声明在 `src/env.d.ts`：`window.cep` 是 CEP 运行时注入的第三方形状（ADR-0024）。
 */
function cepFs(): CepFs {
  const fs = window.cep?.fs
  if (!fs) throw new CepError('NO_CEP', msg.ps.text.cepDialogUnavailable)
  return fs
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/')
}

/**
 * CEP **原生 fs API** 的成功口径：`err === 0`。
 *
 * ⚠️ 与 jsx 的 `{err}` **不是同一套契约**，别合并：jsx 侧原版写 `res.err == 1` 判失败
 * （统一后见 `utils/jsx-result` 的"只有 err === 0 是成功"），而 CEP 原生是 `err !== 0` 失败。
 * 两套各自只判一次，就在这里和 `utils/jsx-result` 各一处。
 */
function isCepOk(err: number): boolean {
  return err === 0
}

/** 打开单个文件；取消返回 null */
export function openFile(title: string, extensions: string[]): string | null {
  const result = cepFs().showOpenDialogEx(false, false, title, '', extensions)
  if (!isCepOk(result.err) || !result.data.length) return null
  return normalizePath(result.data[0])
}

/** 保存文件；取消返回 null。扩展名不存在时自动补第一个 */
export function saveFile(title: string, extensions: string[], defaultName: string): string | null {
  const result = cepFs().showSaveDialogEx(title, '', extensions, defaultName, '')
  if (!isCepOk(result.err) || !result.data) return null

  let path = normalizePath(result.data)
  const suffix = `.${extensions[0] ?? ''}`
  if (extensions.length && !path.toLowerCase().endsWith(suffix.toLowerCase())) {
    path += suffix
  }
  return path
}
