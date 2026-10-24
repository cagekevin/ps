// 是什么：字体项的统一运行时结构（家族名 + 字重 + 字体名 + PostScript 名）。
// 替代了什么：从 `src/cep/types.ts` 迁出——原来放在适配层，导致 `domain/` 反向 import `@/cep`。
// 谁在用：`domain/font-normalize.ts`（唯一归一化入口）、`domain/font-filter.ts`、`domain/quick-font.ts`、
//   `stores/font.ts`、`commands/payloads.ts`、`cep/data/sys-font.ts`、`cep/ps.ts`、`cep/mock.ts`、
//   `pages/fontManage/**`、`pages/fontSet/**`。

/**
 * 字体数据有两种形态，别混：
 *
 * - jsx 返回 / 页面使用：family / weights / names / postScriptNames
 * - 磁盘缓存 SysFont2.json：name / zz / mz / hjm
 *
 * 两者是同一份数据的两套键名（等长数组，同索引对应一个字重），
 * 统一由 `domain/font-normalize.ts` 的 `normalizeFont` 转成 FontItem。
 */
export interface FontItem {
  /** 家族名，如「思源黑体」 */
  family: string
  /** 字重，如 Regular、Bold */
  weights: string[]
  /** 字体名 */
  names: string[]
  /** PostScript 名，设置字体时要传 */
  postScriptNames: string[]
  /** 缺字提示，运行期由 ZitiQiZhi.txt 注入 */
  qz?: string
  /** 收藏等级，运行期由 sj_ztglStar.ini 注入 */
  star?: number
}
