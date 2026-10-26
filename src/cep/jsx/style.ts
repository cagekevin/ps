import { jsxRead, jsxWrite } from '@/cep/transport'
import { typedOutcome } from '@/utils/jsx-result'
import { decoderOf } from '@/utils/decode'
import { isRecord } from '@/utils/guards'
import { READ, WRITE } from './timeouts'
import type { JsxName } from './names'
import type { StyleJsx } from './types'

// 是什么：样式域 jsx 的**唯一实现**（/style 页的"应用"与"添加"）
// 唯一入口：所有样式能力调用都在这里；命令层经 ctx.jsx.style 调用
// 替代了什么：原版 `$cep.jsx` / `jsxHistory` 的散点调用
// 谁在用：commands/style.ts
// 禁止：页面/组件直接 import；新增函数必须同步改 types.ts 与 mock.ts

function read(fn: JsxName, args: unknown[], label: string) {
  return jsxRead(fn, args, { label, timeout: READ })
}

/** 写操作：走 `jsxWrite`（生产者层抛），消费侧只管 `await` */
function write(fn: JsxName, args: unknown[], label: string) {
  return jsxWrite(fn, args, { label, timeout: WRITE })
}

/**
 * `ys_getForegroundColor` **没有信封**：返回值本体就是颜色项，`null` 表示失败
 * （`docs/生成/jsx返回结构复原.md` §2.2 第 16 条：`app.v4.js:42261` `if (a != null)`）。
 * 颜色项字段按 A 级证据取 `{ name, color: { hex, c, m, y, k } }`。
 */
function isForegroundColorData(
  x: unknown,
): x is { name: string; color: { hex: string; c: number; m: number; y: number; k: number } } {
  if (!isRecord(x) || !isRecord(x.color) || typeof x.color.hex !== 'string') return false
  const { c, m, y, k } = x.color
  return (
    typeof x.name === 'string' &&
    typeof c === 'number' &&
    typeof m === 'number' &&
    typeof y === 'number' &&
    typeof k === 'number'
  )
}

/**
 * 样式域真实实现。
 *
 * 参数形状来自 `app.v4.js` 调用侧（行号见 `types.ts` 的 StyleJsx）。
 * **返回结构未实测**（jsxbin 不可读），调用方一律不回读字段，
 * 需要回读的两个（`getForegroundColor` / `getGradientInfo` / `addStyle`）由命令层判空与判 err。
 */
export function createStyleJsx(): StyleJsx {
  return {
    useShapeFill: (color) => write('ys_useShapeFill', [color], '智能填充形状颜色'),
    setBorderColor: (color) => write('ys_setBorderColor', [color], '智能填充边框颜色'),
    changeStyleColor: (color) => write('cy_changeStyleColor', [color], '更改颜色'),
    useStyleColor: (color) => write('ys_useStyleColor', [color], '智能填充颜色'),

    useGradient: (gradient) => write('ys_useGradient', [gradient], '填充渐变色'),

    // 原版 :51509-51510：深拷贝项后挂 groupId 再发
    useStyle: (item, groupId) => {
      const payload = { ...(item as Record<string, unknown>), groupId }
      return write('ps_ysBtnUseStyle', [payload], '应用样式')
    },

    getForegroundColor: async () =>
      typedOutcome(
        await read('ys_getForegroundColor', [], '读取前景色'),
        decoderOf(isForegroundColorData),
        '读取前景色',
      ),
    // 智能填色关时的退路（`app.v4.js:17899`）：色板点色只设前景色，不动图层
    setForegroundColor: (color) => write('ys_setForegroundColor', [color], '设置前景色'),
    getGradientInfo: () => read('ys_getGradientInfo', [], '读取渐变'),

    // 原版 :51532-51536：{ delArr, groupId, envDir: "/SheJiZhuLi" }
    addStyle: ({ delArr, groupId, envDir }) =>
      jsxWrite('ys_AddStyle', [{ delArr, groupId, envDir }], {
        label: '保存图层样式',
        timeout: WRITE,
      }),

    // 快速吸色到组：切工具本身不写文档，但原版走的是同一个 jsx 通道
    setTool: (tool) => write('Tool_set', [tool], '切换工具'),
  }
}
