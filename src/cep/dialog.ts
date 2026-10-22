import { CepError } from '@/utils/errors'

/**
 * CEP 文件对话框。
 *
 * 原版 `D.a.saveFile / openFile` 走 `window.cep.fs.showSaveDialogEx / showOpenDialogEx`
 * （app.v4.js:2465528 附近），不是 ExtendScript File。
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

function cepFs(): CepFs {
  const fs = (window as unknown as { cep?: { fs?: CepFs } }).cep?.fs
  if (!fs) throw new CepError('NO_CEP', 'CEP 文件对话框不可用')
  return fs
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/')
}

/** 打开单个文件；取消返回 null */
export function openFile(title: string, extensions: string[]): string | null {
  const result = cepFs().showOpenDialogEx(false, false, title, '', extensions)
  if (result.err !== 0 || !result.data.length) return null
  return normalizePath(result.data[0])
}

/** 保存文件；取消返回 null。扩展名不存在时自动补第一个 */
export function saveFile(title: string, extensions: string[], defaultName: string): string | null {
  const result = cepFs().showSaveDialogEx(title, '', extensions, defaultName, '')
  if (result.err !== 0 || !result.data) return null

  let path = normalizePath(result.data)
  const suffix = `.${extensions[0] ?? ''}`
  if (extensions.length && !path.toLowerCase().endsWith(suffix.toLowerCase())) {
    path += suffix
  }
  return path
}
