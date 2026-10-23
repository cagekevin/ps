import { jsxCall } from '@/cep/transport'
import type { CommonUseJsx } from './types'

// 是什么：常用页（/commonUse）域 jsx 的**唯一实现**
// 唯一入口：所有常用页专属 jsx 调用都在这里；命令层经 ctx.jsx.commonUse 调用
// 替代了什么：原版散在 CommonUse / 7 个子组件 / 自由面板派发表里的 `$cep.jsx*` 直调
// 谁在用：commands/commonUse.ts
// 禁止：页面/组件直接 import；新增函数必须同步改 types.ts 与 mock.ts

const READ = 10000
const WRITE = 60000
const LONG = 300000

/**
 * 常用页域真实实现。**名字与实参一律照官方派发表与调用点**（T-86a）。
 *
 * 通道：原版按 `l(名字, 文案, 通道, 是否读返回)`（`app.v4.js:17061-17184`）区分
 * jsx / jsxHistory / jsxNoCheck / jsxHistoryNoCheck；我方 transport 只有一个入口
 * （`jsxCall`，`transport.ts:85` 起），**没有历史/非历史两条通道**——差异清单见
 * `tests/cep/jsx-dispatch.test.ts` 的「通道对照」用例，别靠记忆。
 *
 * 返回一律 `unknown`：除 `cy_getPsdForFolder` / `cy_batchOptimizeDoc` / `cy_zoom`
 * 有 A/B 档锚点外，本域返回结构均未实测，命令层只判成败、不读字段。
 */
export function createCommonUseJsx(): CommonUseJsx {
  return {
    // 放大 / 缩小：`cy_zoom([倍数])`（`:38144`）
    zoom: (scale: number) => jsxCall('cy_zoom', [scale], { label: '缩放', timeout: WRITE }),

    // 翻转 6 向：官方调 `cy_transformPosition([方向文本])`（`:38122`），
    // 方向文本映射见 `:37803-37812`（cyLeftRight→"左右" … cyToTop→"上"）
    flip: (direction: string) =>
      jsxCall('cy_transformPosition', [direction], { label: '翻转', timeout: WRITE }),

    // 嵌入图片：官方 `cy_insertionImage([{path, bLink2, bDelete}])`（`:37756`，对象形状 `:38070-38074`）。
    // 注意派发表 key 叫 `cy_embedImage`、jsx 名是 `cy_insertionImage`（`:17061` case 28 → `:17087`）
    embedImage: (options: { path: string; bLink2: unknown; bDelete: unknown }) =>
      jsxCall('cy_insertionImage', [options], { label: '嵌入图片', timeout: LONG }),

    // 嵌入多图片：`cy_embedMultipleImage([])`，官方无参（`:37902`）
    embedMultipleImages: () =>
      jsxCall('cy_embedMultipleImage', [], { label: '嵌入多图片', timeout: LONG }),

    // 导入多图片：官方 `cy_importMultipleImage([{path, toLinkObject}])`（`:38106`）。
    // `path` 由 `cy_getImagePath` 原样给出，**加工点为零**（对象形状 `:38101-38104`）
    importMultipleImages: (options: { path: unknown; toLinkObject: unknown }) =>
      jsxCall('cy_importMultipleImage', [options], { label: '导入多图片', timeout: LONG }),

    // 取要导入的图片路径：`cy_getImagePath()`；官方用 `!== -1` 判取消（`:38099`）。
    // 返回结构未实测（可能单张也可能数组）——调用方**原样透传**给 importMultipleImages
    getImagePath: () => jsxCall('cy_getImagePath', [], { label: '选择图片', timeout: WRITE }),

    // 单文档优化：`cy_optimizeDoc([配置])`（`:38057`；派发表 `:17102` 也是它）
    optimizeOnce: (options: unknown) =>
      jsxCall('cy_optimizeDoc', [options], { label: '优化文档', timeout: LONG }),

    // 文件夹批量优化：`cy_batchOptimizeDoc([配置, 单个文件])`（`:36040`）。
    // **循环在命令层**：官方是前端 `for` 逐张调（`:36024-36046`），我方照此
    optimizeFolder: (options: unknown, file: string) =>
      jsxCall('cy_batchOptimizeDoc', [options, file], { label: '优化文档', timeout: LONG }),

    // 自定义变换：官方把 7 个值拼成数组当实参（`:17165`），故这里是 7 个平铺参数
    transform: (params: [number, number, string, string, number, number, number]) =>
      jsxCall('cy_customBuildTransform', [...params], { label: '自定义变换', timeout: LONG }),

    // 参考线工具：官方 key `cy_useGride` → jsx `cy_createSafeAreaGuide`（`:17168`）
    referenceGuide: (options?: unknown) =>
      jsxCall('cy_createSafeAreaGuide', options === undefined ? [] : [options], {
        label: '参考线工具',
        timeout: WRITE,
      }),

    // 清除参考线 / 切片：官方 key `cy_clearCutGuide` → jsx `cy_guideFunction`（`:17171`）
    referenceSlice: (options?: unknown) =>
      jsxCall('cy_guideFunction', options === undefined ? [] : [options], {
        label: '清除参考线 / 切片',
        timeout: WRITE,
      }),

    // 按间距分布：`cy_distributedByPitch([option])`（`:17173-17175`，实参就是面板给的 option）
    distribute: (options: unknown) =>
      jsxCall('cy_distributedByPitch', [options], { label: '按间距分布', timeout: WRITE }),

    // 文件夹里的 PSD 列表：`cy_getPsdForFolder([目录])`（A/B 档锚点，返回有数据）
    getPsdList: (folder: string) =>
      jsxCall('cy_getPsdForFolder', [folder], { label: '读取文件夹', timeout: READ }),
  }
}
