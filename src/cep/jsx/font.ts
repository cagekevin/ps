import { jsxRead, jsxWrite } from '@/cep/transport'
import { isJsxOkSentinel, typedOutcome } from '@/utils/jsx-result'
import { isArrayOf, isRecord, isUnknownArray } from '@/utils/guards'
import { LONG, READ, WRITE } from './timeouts'
import type { JsxName } from './names'
import type { CurrentFontInfo, FontJsx, TranslateItem } from './types'

// 是什么：字体域 jsx 的**唯一实现**（字体管理页 + 字体面板页共用）
// 唯一入口：所有 PS 字体读写都在这里；命令层经 ctx.jsx.font 调用
// 替代了什么：原版 `$cep.jsx` / `$cep.jsxHistory` 的散点调用
// 谁在用：commands/font.ts、commands/fontSet.ts
// 禁止：页面/组件直接 import；新增函数必须同步改 types.ts 与 mock.ts

function read(fn: JsxName, args: unknown[], label: string) {
  return jsxRead(fn, args, { label, timeout: READ })
}

/**
 * 写操作：**生产者层失败直接抛**。消费侧只管 `await`，不可能忘判 ok。
 *
 * 以前这里只返回两臂，消费侧要自己 `assertJsxOk` / 判 `.ok` —— 20 处忘了判 ⇒ `{err:1}` 静默。
 * 真正该抛的地方是**这里**（生产者），不是每个消费点各加一个 fallback。
 *
 * 成功时**仍返回两臂**（兼容需要读返回值的消费侧，如 `setColor` 的 data）——
 * 所以类型保持 `Promise<JsxOutcome>`，消费者一行都不用改。
 */
/** 写操作（fire-and-forget）：`jsxWrite` 在生产者层抛。类型是 `Promise<void>` —— 消费侧看不到 `JsxOutcome`，不可能忘判 */
function write(fn: JsxName, args: unknown[], label: string): Promise<void> {
  return jsxWrite(fn, args, { label, timeout: WRITE }).then(() => {})
}

/**
 * `zt_getCurrentText` 的 data 条目：只证"是对象，且 `text` 若在必是字符串"。
 * 证据：`docs/生成/jsx返回结构复原.md` §2.2 第 5 条（`app.v4.js:35338-35339` 用 `c.text.length`）。
 * `dst` 是面板回填的译文（`:35374`），不在宿主返回里，所以不进这里的证明。
 */
function isTranslateItem(x: unknown): x is TranslateItem {
  return isRecord(x) && (x.text === undefined || typeof x.text === 'string')
}

/** `ys_getFontInfo` 的 data：`{ fonts: 数组 }`（复原文档 §2.2 第 4 条：`a.data.fonts.length`） */
function isFontInfoData(x: unknown): x is { fonts: unknown[] } {
  return isRecord(x) && isUnknownArray(x.fonts)
}

/** `zt_getCurrentFontInfo` 的 data：只证"是对象，且 `family` 若在必是字符串"（消费侧只用 `family`） */
function isCurrentFontInfo(x: unknown): x is CurrentFontInfo {
  return isRecord(x) && (x.family === undefined || typeof x.family === 'string')
}

/** `zt_setFontColor` 的 data：`{ rgb: { r, g, b } }`（复原文档把 `zt_setFontColor` 列在 A 级"有数据"） */
function isSetColorData(x: unknown): x is { rgb: { r: number; g: number; b: number } } {
  if (!isRecord(x) || !isRecord(x.rgb)) return false
  const { r, g, b } = x.rgb
  return typeof r === 'number' && typeof g === 'number' && typeof b === 'number'
}

/**
 * 字体域真实实现。
 *
 * 参数形状全部来自 `app.v4.js` 的调用侧（行号见每个方法），
 * **返回结构大多未实测**，调用方一律经 `utils/jsx-result` 解释，不要在这里猜。
 */
export function createFontJsx(): FontJsx {
  return {
    // ---------- 字体管理页 ----------
    initSystemList: async () =>
      typedOutcome(
        await jsxRead('ztgl_initSystemList', [], {
          label: '读取系统字体',
          timeout: LONG,
        }),
        // 两种合法形态：数组（系统字体清单）或哨兵（宿主说"去读 SysFont2.json"）。
        // 哨兵判据只有一份：`utils/jsx-result.isJsxOkSentinel`（调用点不许再写 `'ok' || 'OK'`）
        (data) => (isUnknownArray(data) ? data : isJsxOkSentinel(data) ? data : null),
        '读取系统字体',
      ),

    setFont: (postScriptName, name, weight) =>
      write('ztgl_setFont', [postScriptName, name, weight], `设置字体 ${name}`),

    // ---------- 字体面板：读 ----------
    // 依据 app.v4.js:42471（mounted 里 jsxNoCheck("AppPreferences.typeUnits", [])）
    getTypeUnits: () => read('AppPreferences.typeUnits', [], '读取单位设置'),

    // 依据 app.v4.js:42523（selectLayer 里 jsxNoCheck("zt_getFontSimpleInfo")）
    getFontSimpleInfo: () => read('zt_getFontSimpleInfo', [], '读取当前文字属性'),

    // 依据 app.v4.js:40085（fontSetQuick.addCurrentLayer）
    getCurrentFontInfo: async () =>
      typedOutcome(
        await read('zt_getCurrentFontInfo', [], '读取当前图层字体'),
        (data) => (isCurrentFontInfo(data) ? data : null),
        '读取当前图层字体',
      ),

    // 依据 app.v4.js:43348（translate 里 jsx("zt_getCurrentText")）
    getCurrentText: async () =>
      typedOutcome(
        await read('zt_getCurrentText', [], '读取选中文字'),
        (data) => (isArrayOf(data, isTranslateItem) ? data : null),
        '读取选中文字',
      ),

    // 依据 app.v4.js:43456（handle2 t=0）
    getFontInfo: async () =>
      typedOutcome(
        await read('ys_getFontInfo', [], '复制文字属性'),
        (data) => (isFontInfoData(data) ? data : null),
        '复制文字属性',
      ),

    // ---------- 字体面板：写 ----------
    // 依据 app.v4.js:42420（setFontSize 里 layer_font_setFontSize [parseFloat(t)]）
    setNumberSize: (size) => write('layer_font_setFontSize', [size], `设置字号 ${String(size)}`),

    // 依据 app.v4.js:39979（层级字号点一下 → zt_setFontSize [t]）
    setHierarchySize: (size) => write('zt_setFontSize', [size], `设置层级字号 ${String(size)}`),

    // 依据 app.v4.js:42352（layer_font_setLeading [a]）
    setLeading: (leading) => write('layer_font_setLeading', [leading], '设置行距'),

    // 依据 app.v4.js:42323（zt_setFontWordSpacing [t]）
    setTracking: (tracking) => write('zt_setFontWordSpacing', [tracking], '设置字距'),

    // 依据 app.v4.js:42290（zt_setFontColor 无参，返回 { err, data }）
    setColor: async () =>
      typedOutcome(
        await jsxRead('zt_setFontColor', [], { label: '设置字体颜色', timeout: WRITE }),
        (data) => (isSetColorData(data) ? data : null),
        '设置字体颜色',
      ),

    // 依据 app.v4.js:42556（zt_setFontName [hjm, mz, zz]）
    setFontName: (postScriptName, name, weight) =>
      // `hostCode === 1` 表示字体缺失（消费侧 `requireFontApplied` 靠它弹下载确认）⇒ 要读失败臂
      // 返回失败臂（`requireFontApplied` 靠 `hostCode === 1` 判字体缺失）⇒ 直调 `jsxCall`
      jsxWrite('zt_setFontName', [postScriptName, name, weight], {
        label: `设置字体 ${name}`,
        timeout: WRITE,
      }),

    // 依据 app.v4.js:42467
    setAllCaps: (value) => write('zt_setFontAllCaps', [value], '切换全部大写'),

    // 依据 app.v4.js:42475
    setFontVision: (mode) => write('zt_setFontVision', [mode], '切换文字视觉调整'),

    // 依据 app.v4.js:42485
    setFauxItalic: (value) => write('zt_setFauxItali', [value], '切换倾斜'),

    // 依据 app.v4.js:42496
    setFauxBold: (value) => write('zt_setFontAddBold', [value], '切换加粗'),

    // 依据 app.v4.js:42455
    setJustified: (index) => write('zt_setFontJustified', [index], '设置段落文本对齐'),

    // 依据 app.v4.js:42458（第二参数原版是 shiftKey）；底部对齐只传一个参数，见 :38080
    setTextAlignment: (index, shift) =>
      write('zt_setTextAlignment', shift === undefined ? [index] : [index, shift], '设置文本对齐'),

    // 依据 app.v4.js:38233（zt_setHorizontalCenters [4]）
    setHorizontalCenters: () => write('zt_setHorizontalCenters', [4], '水平居中分布'),

    // 依据 app.v4.js:38268（zt_verticalCenter [5]）
    setVerticalCenter: () => write('zt_verticalCenter', [5], '垂直平均分布'),

    // 依据 app.v4.js:38277
    setTextUpDownAlign: (index) => write('zt_setUpDownAlign', [index], '设置垂直对齐'),

    // 依据 app.v4.js:38203 / 38210（无自由面板时固定 3 / 4）
    setBackgroundAlign: (value) => write('zt_setBackrgoudAlign', [value], '与背景对齐'),

    // 依据 app.v4.js:43100（$appBus ztAlignHorizontal → jsxHistory("zt_alignHorizontal")）
    alignHorizontal: () => write('zt_alignHorizontal', [], '水平垂直居中对齐'),

    // 依据 app.v4.js:43190（[showDistribution, value, 2, filter]）
    distributeByPitch: (axis, value, filter) =>
      write('cy_distributedByPitch', [axis, value, 2, filter], '按间距分布'),

    // ---------- 文本 ----------
    // 依据 app.v4.js:38916 / 38925（原版"先探一次 → 再真执行"，两步不能合并）
    // 两处都按 jsxName 调：原版 :38916 用的是派发表 key `zt_changeTextBranchMerge`，
    // 它在 case 94 转发到同一个 `zt_textBranchMerge`；本仓约定不许把 key 当函数名（jsx-dispatch 闸钉着）。
    // 通道差异（jsx vs jsxHistory）我方 transport 不区分，见 types.ts:165（D-25）。
    changeTextBranchMerge: (mode) => write('zt_textBranchMerge', [mode], '拆分/合并文本'),
    textBranchMerge: (mode) => write('zt_textBranchMerge', [mode], '拆分/合并文本'),

    // 依据 app.v4.js:39070
    createButton: (config) => write('zt_createButton', [config], '生成按钮'),

    // 依据 app.v4.js:43521 / 43532
    checkUseFont: (payload) => write('ys_checkUseFont', [payload], '检查字体可用性'),
    useFont: (payload) => write('ys_useFont', [payload], '应用字体设置'),

    // 依据 app.v4.js:43478
    switchFontDirection: () => write('zt_switchFontDirection', [], '切换文本方向'),

    // 依据 app.v4.js:43426（[data, delete]）
    setTranslateText: (data, replace) =>
      write('zt_setTranslateText', [data, replace], '写回翻译文本'),
  }
}
