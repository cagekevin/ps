import { jsxCall } from '@/cep/transport'
import type { CommonUseJsx } from './types'

// 是什么：常用页（/commonUse）域 jsx 的**唯一实现**
// 唯一入口：所有常用页专属 jsx 调用都在这里；命令层经 ctx.jsx.commonUse 调用
// 替代了什么：原版散在 CommonUse / 7 个子组件里的 `$cep.jsx.*` 直调
// 谁在用：commands/commonUse.ts
// 禁止：页面/组件直接 import；新增函数必须同步改 types.ts 与 mock.ts

const READ = 10000
const WRITE = 60000
const LONG = 300000

/**
 * 常用页域真实实现。
 *
 * UNVERIFIED（按锚点分三档，见下）：
 * - **有锚点**：`cy_zoom` / `cy_batchOptimizeDoc` / `cy_getPsdForFolder`
 *   （`docs/生成/jsx返回结构复原.md:610` 的「C 未消费」清单与 `:608` 的「B/A 有数据」清单）；
 * - **推断名**（原版事件前缀推断，无函数级锚点）：`cy_flipLayer` / `cy_embedImage` /
 *   `cy_importMultipleImage` / `cy_customTransform` / `cy_referenceLine` / `cy_distribute`。
 *   依据是 `docs/页面/05-常用.md:45` 的 24 个 `$appBus` 事件前缀
 *   （`cyEmbedImg` … `fp_cy_importMultipleImage`）与 `docs/页面/05-常用.md:57,63`
 *   的参数顺序表；
 * - **参数形状**：除 `cy_distributedByPitch`（字体域，`docs/架构/jsx契约.md:69`）外，
 *   本域全部函数的参数形状与返回结构都**未实测**。
 *
 * 返回一律 `unknown`，由命令层只判成败，不读字段。
 */
export function createCommonUseJsx(): CommonUseJsx {
  return {
    // 放大 / 缩小：原版 `cy_zoom`（未消费返回，只发不读）
    zoom: (scale: number) => jsxCall('cy_zoom', [scale], { label: '缩放', timeout: WRITE }),

    // 翻转 6 向：名字按 `cy_*` 族推断（原版方法名未提取），未实测
    flip: (direction: string) =>
      jsxCall('cy_flipLayer', [direction], { label: '翻转', timeout: WRITE }),

    // 嵌入图片 / 转链接智能对象：事件前缀 `cyEmbedImg` 推断，未实测
    embedImage: (options: unknown) =>
      jsxCall('cy_embedImage', [options], { label: '嵌入图片', timeout: LONG }),

    // 导入多图片：事件前缀 `fp_cy_importMultipleImage` 推断，未实测
    importMultipleImages: (paths: string[]) =>
      jsxCall('cy_importMultipleImage', [paths], { label: '导入多图片', timeout: LONG }),

    // 批量优化文档：`cy_batchOptimizeDoc`（有锚点，未消费返回）
    optimizeDoc: (options: unknown) =>
      jsxCall('cy_batchOptimizeDoc', [options], { label: '优化文档', timeout: LONG }),

    // 自定义变换：参数顺序 `[number, angle, leftRigth, topBottom, pointIndex, scale, opacity]`
    // （`docs/页面/05-常用.md:57`）；函数名推断，未实测
    transform: (params: unknown[]) =>
      jsxCall('cy_customTransform', [params], { label: '自定义变换', timeout: LONG }),

    // 参考线：智能参考线 / 清除 / 切片 / 安全区；函数名推断，未实测
    referenceLines: (action: string, options: unknown) =>
      jsxCall('cy_referenceLine', [action, options], { label: '参考线', timeout: WRITE }),

    // 按间距分布：参数顺序 `[t, width, mode]`（`docs/页面/05-常用.md:63`）；函数名推断，未实测
    distribute: (params: unknown[]) =>
      jsxCall('cy_distribute', [params], { label: '按间距分布', timeout: WRITE }),

    // 文件夹里的 PSD 列表：`cy_getPsdForFolder`（有锚点，返回有数据）
    getPsdList: (folder: string) =>
      jsxCall('cy_getPsdForFolder', [folder], { label: '读取文件夹', timeout: READ }),
  }
}
