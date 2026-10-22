import { jsxCall } from '@/cep/transport'
import type { CustomJsx, CustomRequest } from './types'

// 是什么：自定义页（/custom）域 jsx 的**唯一实现**
// 唯一入口：所有 `zdy_*` 调用都在这里；命令层经 ctx.jsx.custom 调用
// 替代了什么：原版 `$cep.jsx.zdy_*` 的散点调用
// 谁在用：commands/custom.ts
// 禁止：页面/组件直接 import；新增函数必须同步改 types.ts 与 mock.ts

const READ = 10000
const WRITE = 20000

function read(fn: string, args: unknown[], label: string) {
  return jsxCall(fn, args, { label, timeout: READ })
}

function write(fn: string, args: unknown[], label: string) {
  return jsxCall(fn, args, { label, timeout: WRITE })
}

/**
 * 自定义域真实实现。
 *
 * UNVERIFIED: 四个函数的**参数形状与返回结构全部未实测**。
 * jsxbin 是字节码，符号不可读；`docs/页面/04-自定义.md:60-62` 明确记「四个签名与返回结构都未提取」。
 * 依据只到"调用侧存在这四个名字"这一级（`04-自定义.md:113` `zdy_mergeRectangles`、
 * `:195` `zdy_generate`、`:16-17` `zdy_checkStatus` / `zdy_checkMergeRectangles`）。
 *
 * 这里按**最宽松联合**落地：一个对象参数（页面所有状态），
 * 返回一律 `unknown`，由命令层经 `utils/jsx-result` 判成败，不读任何字段。
 * 首次真机很可能参数形状不对——台账留了一条实测项。
 */
export function createCustomJsx(): CustomJsx {
  return {
    // 选中区 / 选区状态检查：原版在生成前先问一次
    checkStatus: (request: CustomRequest) => read('zdy_checkStatus', [request], '检查生成状态'),

    // 合并矩形前的检查
    checkMergeRectangles: (request: CustomRequest) =>
      read('zdy_checkMergeRectangles', [request], '检查可合并矩形'),

    // 合并矩形
    mergeRectangles: (request: CustomRequest) =>
      write('zdy_mergeRectangles', [request], '合并矩形'),

    // 生成框架
    generate: (request: CustomRequest) => write('zdy_generate', [request], '生成框架'),
  }
}
