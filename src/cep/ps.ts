import { CepError, ERR_PREFIX } from '@/utils/errors'
import { normalizeFontList } from '@/domain/font-normalize'
import { evalScriptRaw, hasCep } from './transport'
import { PS_ENV } from './env'
import { extensionDir } from './fs'
import { mergeFontStars, readSysFontFile } from './data/sys-font'
import { jsx } from './jsx'
import type { LayerState } from './types'
import type { FontItem } from '@/domain/font-item'

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
  if (!dir) throw new CepError('INIT', '拿不到扩展目录（getSystemPath("extension") 失败）')

  const jsxPath = `${dir}/lib/all.decrypted.js`

  // 必须是顶层语句，不能包在 IIFE 里：$.evalFile 继承调用处的作用域，
  // 包进函数后 jsxbin 定义的函数会落在局部作用域，函数返回即销毁。
  const loadRes = await evalScriptRaw(
    `try { $.evalFile("${jsxPath}"); "OK" } catch (e) { "${ERR_PREFIX}" + e.message }`,
    30000,
  )
  if (loadRes !== 'OK') {
    throw new CepError('INIT', `加载 jsx 失败：${loadRes.replace(ERR_PREFIX, '')}`)
  }

  const typeRes = await evalScriptRaw('typeof ztgl_initSystemList')
  if (typeRes !== 'function') {
    const diag = await evalScriptRaw(
      `(function(){var f = new File("${jsxPath}");` +
        `return [f.exists ? 'exists' : 'missing', typeof Sys_setSystemEnvInfo, typeof app].join('|');})()`,
      10000,
    ).catch(() => '诊断脚本也失败了')
    throw new CepError(
      'INIT',
      `jsx 已加载，但 ztgl_initSystemList 不可用（typeof = ${typeRes}；${diag}）`,
    )
  }

  // 不注入环境变量，jsx 内部拼路径时会报「undefined 不是对象」
  await jsx.env.setEnv(JSON.stringify(PS_ENV))
}

/**
 * 读字体列表。
 *
 * ztgl_initSystemList() 实测直接返回字体数组（family/weights/names/postScriptNames）。
 * 有些版本会返回状态字符串 "ok"、数据写到 SysFont2.json，所以两种都兜住。
 */
export async function getFontList(opts: { refresh?: boolean } = {}): Promise<FontItem[]> {
  await initJsx()

  if (!opts.refresh) {
    const cached = await readSysFontFile()
    if (cached.length) return cached
  }

  const res = await jsx.font.initSystemList()

  if (res === 'ok') {
    const fromFile = await readSysFontFile()
    if (!fromFile.length) {
      throw new CepError('PARSE', 'ztgl_initSystemList 返回 ok，但读不到 SysFont2.json')
    }
    return fromFile
  }

  const list = normalizeFontList(res)
  if (!list.length) {
    throw new CepError(
      'PARSE',
      `ztgl_initSystemList 返回了无法识别的数据：${String(res).slice(0, 120)}`,
    )
  }
  return await mergeFontStars(list)
}

/** 标签/星级读取已迁到 data/font-meta；这里保留旧入口，store 不需要知道迁移 */
export { readFontTags as getFontTags, readFontStars as getFontStars } from './data/font-meta'

/**
 * 写 PS 文档的能力**不在这里**（`font.apply` 命令直接调 `ctx.jsx.font`）。
 *
 * 这样页面即使 import 了 `ps.ts`，也拿不到任何"写"入口——
 * 结构上没有，比再多一条 eslint 规则可靠（见 plan 4.7）。
 */

/**
 * 读 PS 当前动作面板的**原始**返回。
 *
 * 只做"取回来"，不解析：结构未真机验证，解析放 `domain/action` 的 `readActionList`，
 * 模型化放 `stores/action` 的 `loadPsActions`。这样页面不需要 import 这里。
 */
export async function getRawActionList(): Promise<unknown> {
  await initJsx()
  return jsx.action.getActionList()
}

/** 当前选中图层状态 */
export async function getLayerState(): Promise<LayerState> {
  await initJsx()

  const selected = await jsx.layer.isSelectLayer()
  const typeNumber = await jsx.layer.getTypeNumber()

  return {
    hasSelection: selected === true || String(selected) === 'true',
    typeNumber: Number(typeNumber) || 0,
  }
}
