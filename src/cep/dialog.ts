import { getCep } from './host'
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
  const fs = getCep()?.fs
  if (!fs) throw new CepError('NO_CEP', msg.ps.text.cepDialogUnavailable)
  return fs
}

/**
 * 取 CEP `fs` 上的**某一个**方法（每个出口只要它自己用的那个）。
 *
 * "方法缺失"也算拿不到：老 CEP / `window.cep` 被部分注入时可能只给一个方法。
 * 与 `cep/paths.ts` 对桥的判据同一条（那里是 `typeof bridge.getSystemPath !== 'function'` ⇒ 抛）——
 * 不许让缺方法变成 `fs.showOpenDialogEx is not a function` 这种说不清的 TypeError。
 */
function cepMethod<K extends keyof CepFs>(name: K): CepFs[K] {
  const fn = cepFs()[name]
  if (typeof fn !== 'function') throw new CepError('NO_CEP', msg.ps.text.cepDialogUnavailable)
  return fn
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
  const showOpen = cepMethod('showOpenDialogEx')
  const result = showOpen(false, false, title, '', extensions)
  // `data[0]` 也要判：`{ err: 0, data: [''] }` 是取消的另一种形态，
  // 空串不是路径 —— 交给调用方去拼目录会拼出 `<空>/xxx`。
  if (!isCepOk(result.err) || !result.data[0]) return null
  return normalizePath(result.data[0])
}

/** 保存文件；取消返回 null。扩展名不存在时自动补第一个 */
export function saveFile(title: string, extensions: string[], defaultName: string): string | null {
  const showSave = cepMethod('showSaveDialogEx')
  const result = showSave(title, '', extensions, defaultName, '')
  if (!isCepOk(result.err) || !result.data) return null

  let path = normalizePath(result.data)
  const suffix = `.${extensions[0] ?? ''}`
  if (extensions.length && !path.toLowerCase().endsWith(suffix.toLowerCase())) {
    path += suffix
  }
  return path
}
