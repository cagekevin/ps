import { jsxCall } from '@/cep/transport'
import { LONG, READ, WRITE } from './timeouts'
import type { FontJsx } from './types'

// 是什么：字体域 jsx 的**唯一实现**（字体管理页 + 字体面板页共用）
// 唯一入口：所有 PS 字体读写都在这里；命令层经 ctx.jsx.font 调用
// 替代了什么：原版 `$cep.jsx` / `$cep.jsxHistory` 的散点调用
// 谁在用：commands/font.ts、commands/fontSet.ts
// 禁止：页面/组件直接 import；新增函数必须同步改 types.ts 与 mock.ts

function read(fn: string, args: unknown[], label: string) {
  return jsxCall(fn, args, { label, timeout: READ })
}

function write(fn: string, args: unknown[], label: string) {
  return jsxCall(fn, args, { label, timeout: WRITE })
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
    initSystemList: () =>
      jsxCall('ztgl_initSystemList', [], {
        label: '读取系统字体',
        timeout: LONG,
      }),

    setFont: (postScriptName, name, weight) =>
      write('ztgl_setFont', [postScriptName, name, weight], `设置字体 ${name}`),

    // ---------- 字体面板：读 ----------
    // 依据 app.v4.js:42471（mounted 里 jsxNoCheck("AppPreferences.typeUnits", [])）
    getTypeUnits: () => read('AppPreferences.typeUnits', [], '读取单位设置'),

    // 依据 app.v4.js:42523（selectLayer 里 jsxNoCheck("zt_getFontSimpleInfo")）
    getFontSimpleInfo: () => read('zt_getFontSimpleInfo', [], '读取当前文字属性'),

    // 依据 app.v4.js:40085（fontSetQuick.addCurrentLayer）
    getCurrentFontInfo: () => read('zt_getCurrentFontInfo', [], '读取当前图层字体'),

    // 依据 app.v4.js:43348（translate 里 jsx("zt_getCurrentText")）
    getCurrentText: () => read('zt_getCurrentText', [], '读取选中文字'),

    // 依据 app.v4.js:43456（handle2 t=0）
    getFontInfo: () => read('ys_getFontInfo', [], '复制文字属性'),

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
    setColor: () => write('zt_setFontColor', [], '设置字体颜色'),

    // 依据 app.v4.js:42556（zt_setFontName [hjm, mz, zz]）
    setFontName: (postScriptName, name, weight) =>
      write('zt_setFontName', [postScriptName, name, weight], `设置字体 ${name}`),

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
    // 依据 app.v4.js:38916 / 38925
    changeTextBranchMerge: (mode) => write('zt_changeTextBranchMerge', [mode], '拆分/合并文本'),
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
