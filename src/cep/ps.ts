import { CepError, ERR_PREFIX } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { isJsxOkSentinel } from '@/utils/jsx-result'
import { evalScriptRaw, hasCep } from './transport'
import { PS_ENV } from './env'
import { extensionDir } from './paths'
import { jsx } from './jsx'
import type { LayerState } from './types'

let initPromise: Promise<void> | null = null

/**
 * 加载 jsx 并注入环境变量，成功一次后不再执行。
 * 失败会把缓存清掉，允许重试。
 */
export function initJsx(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit().catch((e) => {
      initPromise = null
      throw e
    })
  }
  return initPromise
}

async function doInit(): Promise<void> {
  if (!hasCep()) return

  const dir = extensionDir()
  if (!dir) throw new CepError('INIT', msg.ps.text.extDirUnavailable)

  const jsxPath = `${dir}/lib/all.decrypted.js`

  // 必须是顶层语句，不能包在 IIFE 里：$.evalFile 继承调用处的作用域，
  // 包进函数后 jsxbin 定义的函数会落在局部作用域，函数返回即销毁。
  const loadRes = await evalScriptRaw(
    `try { $.evalFile("${jsxPath}"); "OK" } catch (e) { "${ERR_PREFIX}" + e.message }`,
    30000,
  )
  if (!isJsxOkSentinel(loadRes)) {
    throw new CepError('INIT', msg.ps.fn.loadJsxFailed(loadRes.replace(ERR_PREFIX, '')))
  }

  const typeRes = await evalScriptRaw('typeof ztgl_initSystemList')
  if (typeRes !== 'function') {
    const diag = await evalScriptRaw(
      `(function(){var f = new File("${jsxPath}");` +
        `return [f.exists ? 'exists' : 'missing', typeof Sys_setSystemEnvInfo, typeof app].join('|');})()`,
      10000,
    ).catch(() => '诊断脚本也失败了')
    throw new CepError('INIT', msg.ps.fn.initSystemListUnavailable(typeRes, diag))
  }

  // 不注入环境变量，jsx 内部拼路径时会报「undefined 不是对象」
  await jsx.env.setEnv(JSON.stringify(PS_ENV))
}

/**
 * 本文件只留两件事：**初始化**（`initJsx`）与**选区状态**（`getLayerState`，`selection/` 在用）。
 *
 * 读能力同样不在这里：字体列表在 `data/font-list.ts`、标签/星级在 `data/font-meta.ts`、
 * 动作原始返回在 `data/actions.ts`。所以 `stores/**` 物理上不需要 import 本文件——
 * 结构上没有，比再多一条 eslint 规则可靠（见 plan 4.7）。
 *
 * 写 PS 文档的能力也**不在这里**（`font.apply` 命令直接调 `ctx.jsx.font`）。
 */

/**
 * 当前选中图层状态。
 *
 * **值读不懂就抛，不折成「没有选中」**：`0` 正是「非文字图层」的合法编码
 * 把它当解析失败的兜底 = 把「读失败」说成「你选的东西不对」——用户看到的是文字类命令
 * 永久不可用，而不是 PS 出了问题。两个查询各自有可判定的区间：
 * `Layer_isSelectLayer` 只认布尔（或 `'true'`/`'false'`），`Layer_getTypeNumber` 只认有限数；
 * 其余一律 `PARSE`，带上函数名与原始值片段，由 `describeCepError` 原样带到用户眼前。
 */
export async function getLayerState(): Promise<LayerState> {
  await initJsx()

  const selectedOutcome = await jsx.layer.isSelectLayer()
  if (!selectedOutcome.ok) {
    throw new CepError(selectedOutcome.code, selectedOutcome.reason || 'Layer_isSelectLayer 失败')
  }
  const selected = selectedOutcome.data
  if (selected !== true && selected !== false && selected !== 'true' && selected !== 'false') {
    throw new CepError('PARSE', msg.ps.fn.isSelectLayerUnrecognized(previewValue(selected)))
  }

  const typeNumberOutcome = await jsx.layer.getTypeNumber()
  if (!typeNumberOutcome.ok) {
    throw new CepError(
      typeNumberOutcome.code,
      typeNumberOutcome.reason || 'Layer_getTypeNumber 失败',
    )
  }
  const parsed = parseTypeNumber(typeNumberOutcome.data)
  if (parsed === null) {
    throw new CepError(
      'PARSE',
      msg.ps.fn.getTypeNumberUnrecognized(previewValue(typeNumberOutcome.data)),
    )
  }

  return { hasSelection: selected === true || selected === 'true', typeNumber: parsed }
}

/** 原始值片段：文案/日志里只放这么多，不把整段 jsx 返回抄进 toast */
function previewValue(value: unknown): string {
  const text = typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value))
  return text.slice(0, 60)
}

/** 只接受有限数（含数字字符串）；其余返回 null，由调用方决定抛什么 */
function parseTypeNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}
