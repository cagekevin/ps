import { jsxCall } from '@/cep/transport'
import { LONG, WRITE } from './timeouts'
import type { RenameJsx } from './types'

/**
 * 重命名域真实实现。
 *
 * 两个函数都只**发**不读返回：原版 `$cep.jsx` / `$cep.jsxHistory` 也不消费返回值
 * （`docs/生成/jsx返回结构复原.md` 把 `cmm_setLayerColor` 归在"未消费"一类）。
 *
 * UNVERIFIED: `cmm_batchName` / `cmm_setLayerColor` 的返回结构未实测
 * （实现在 jsxbin 里，`public/lib/all.decrypted.js` 搜不到函数名），所以这里不回读、不解析。
 */
export function createRenameJsx(): RenameJsx {
  return {
    /** cmm_batchName([表达式, 是否过滤子图层], "重命名")（app.v4.js:57234） */
    batchName: (expression, filterChildren) =>
      jsxCall('cmm_batchName', [expression, filterChildren], {
        label: '批量重命名图层',
        // 图层多的时候 PS 侧会跑一阵，给足余量；原版靠 $load 转圈，我们走长任务 HUD
        timeout: LONG,
      }),

    /** cmm_setLayerColor([颜色序号])（app.v4.js:57220）；0 = 清除颜色 */
    setLayerColor: (colorIndex) =>
      jsxCall('cmm_setLayerColor', [colorIndex], {
        label: '设置图层颜色标记',
        timeout: WRITE,
      }),
  }
}
