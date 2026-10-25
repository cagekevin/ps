// 是什么：系统字体列表的取数入口（读 SysFont2 缓存 → 让 PS 重建 → 再读 → 并星级）
// 替代了什么：`src/cep/ps.ts` 的 `getFontList`（ps.ts 只留初始化与选区状态，不再被 stores 需要）
// 谁在用：`stores/font.ts`（列表只读投影）、`commands/fontSet.ts`（字体下拉候选）
// 禁止：页面 import 本文件（走 store）；这里不写盘、不落状态

import { normalizeFontList } from '@/domain/font-normalize'
import { CepError } from '@/utils/errors'
import { isJsxOkSentinel } from '@/utils/jsx-result'
import { msg } from '@/domain/messages'
import { initJsx } from '@/cep/ps'
import { jsx } from '@/cep/jsx'
import { mergeFontStars, readSysFontFile } from './sys-font'
import type { FontItem } from '@/domain/font-item'

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
    // 只有"读到了且非空"才算命中缓存；读不到继续往下走，让 PS 重建一次
    if (cached.status === 'ok' && cached.list.length) return cached.list
  }

  const res = await jsx.font.initSystemList()

  if (!res.ok) {
    throw new CepError(res.code, res.reason || 'ztgl_initSystemList 失败')
  }
  const data = res.data

  // 哨兵判据只有一份：`utils/jsx-result.isJsxOkSentinel`（不许在调用点再写 `'ok' || 'OK'`）
  if (isJsxOkSentinel(data)) {
    const fromFile = await readSysFontFile()
    if (fromFile.status === 'error') {
      // TD-09-3：把**为什么**读不到带出去，别让页面只写"读不到系统字体"却查不到原因
      throw new CepError('IO', msg.data.fn.sysFontReadFailed(fromFile.reason))
    }
    if (fromFile.status === 'none' || !fromFile.list.length) {
      throw new CepError('PARSE', msg.data.text.sysFontEmpty)
    }
    return fromFile.list
  }

  // 空数组 = PS 那边确实一个系统字体都没有（这是"没有"，不是"读不懂"）
  if (Array.isArray(data) && data.length === 0) return []

  const list = normalizeFontList(data)
  if (!list.length) {
    throw new CepError('PARSE', msg.data.fn.sysFontUnrecognized(String(data).slice(0, 120)))
  }
  return await mergeFontStars(list)
}
