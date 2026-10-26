import { getFontList } from '@/cep/mock'
import { log } from '@/utils/logger'
import type { JsxOutcome as _JsxOutcome } from '@/utils/jsx-result'
import type { JsxPort } from './types'

// 是什么：jsx 在浏览器里的假实现
// 唯一入口：与真实实现共用 JsxPort；漏一个函数编译失败
// 替代了什么：旧 `ps.ts` 里的 `if (!hasCep())` 双路径
// 谁在用：createJsxPort(false)（dev / 测试）
// 禁止：只有这里能返回假数据；命令层不要判断环境

/** 写函数（fire-and-forget）的 mock：`Promise<void>` —— 消费侧看不到 `JsxOutcome`（深模块） */
const okVoid = (): Promise<void> => Promise.resolve()

/** 与 `V.a.info` 的字体属性默认值同形（app.v4.js:42253-42281） */
const FONT_INFO = {
  size: '12 点',
  weight: 'Regular',
  fauxBold: false,
  fauxItalic: false,
  useAutoLeading: false,
  leading: 0,
  tracking: 0,
  autoKerning: 'manual',
  capitalization: 'Nrml',
  color: { rgb: { r: 255, g: 255, b: 255 } },
  family: '苹方',
  justification: 'left',
}

export function createMockJsx(): JsxPort {
  return {
    font: {
      // 返回已归一化的 FontItem[]，调用方的 normalizeFont 是幂等的
      initSystemList: async () => ({ status: 'ok', data: await getFontList() }),

      setFont: async (postScriptName, name, weight) => {
        log.info('mock', `设置字体 ${name} / ${weight}（${postScriptName}）`)
        return
      },

      getTypeUnits: () => Promise.resolve({ status: 'ok', data: 'TypeUnits.POINTS' }),
      getFontSimpleInfo: () => Promise.resolve({ status: 'ok', data: { ...FONT_INFO } }),
      getCurrentFontInfo: () =>
        Promise.resolve({
          status: 'ok',
          data: {
            family: '思源黑体 CN',
            name: 'Source Han Sans CN Regular',
            scriptName: 'SourceHanSansCN-Regular',
          },
        }),
      getCurrentText: () =>
        Promise.resolve({
          status: 'ok',
          data: [{ text: '设计助理' }, { text: 'Design Assistant' }],
        }),
      getFontInfo: () =>
        Promise.resolve({
          status: 'ok',
          data: {
            fonts: [
              {
                scriptFamily: 'SourceHanSansCN-Regular',
                color: { rgb: { r: 255, g: 255, b: 255 } },
                opacity: 100,
                size: 12,
                leading: 0,
                tracking: 0,
              },
            ],
          },
        }),

      setNumberSize: okVoid,
      setHierarchySize: okVoid,
      setLeading: okVoid,
      setTracking: okVoid,
      setColor: () => Promise.resolve({ status: 'ok', data: { rgb: { r: 110, g: 120, b: 255 } } }),
      setFontName: async (postScriptName, name) => {
        log.info('mock', `字体面板换字体 ${name}（${postScriptName}）`)
      },
      setAllCaps: okVoid,
      setFontVision: okVoid,
      setFauxItalic: okVoid,
      setFauxBold: okVoid,
      setJustified: okVoid,
      setTextAlignment: okVoid,
      setHorizontalCenters: okVoid,
      setVerticalCenter: okVoid,
      setTextUpDownAlign: okVoid,
      setBackgroundAlign: okVoid,
      alignHorizontal: okVoid,
      distributeByPitch: okVoid,

      changeTextBranchMerge: okVoid,
      textBranchMerge: okVoid,
      createButton: okVoid,
      checkUseFont: okVoid,
      useFont: okVoid,
      switchFontDirection: okVoid,
      setTranslateText: okVoid,
    },

    layer: {
      isSelectLayer: () => Promise.resolve({ status: 'ok', data: true }),
      getTypeNumber: () => Promise.resolve({ status: 'ok', data: 2 }),
    },

    env: {
      setEnv: okVoid,
    },

    action: {
      // 与真实 dz_getActionList 同形：{ name, children:[{ name }] }
      getActionList: () =>
        Promise.resolve({
          status: 'ok',
          data: [
            { name: '修图', children: [{ name: '一键磨皮' }] },
            { name: '新建文档', children: [{ name: '800x800' }] },
          ],
        }),

      callAction: async (item) => {
        log.info('mock', `执行动作 ${item.group} / ${item.name}`)
        return
      },
    },

    legacy: {
      call: async (key, args) => {
        log.info('mock', `执行旧自由面板 key ${key}`, args)
        return
      },
    },

    // 重命名域的表达式求值在 PS 侧，这里只能假装成功（返回 null，和真实实现一样不消费）
    rename: {
      batchName: async (expression, filterChildren) => {
        log.info('mock', `批量重命名 ${expression}（过滤子图层=${filterChildren}）`)
        return
      },
      setLayerColor: async (colorIndex) => {
        log.info('mock', `图层颜色标记 ${colorIndex}`)
        return
      },
    },
    // 样式域：返回结构未实测，mock 只保证"调用不炸、能看出走到哪一步"
    style: {
      useShapeFill: async (color) => {
        log.info('mock', 'ys_useShapeFill', color)
        return
      },
      setBorderColor: async (color) => {
        log.info('mock', 'ys_setBorderColor', color)
        return
      },
      changeStyleColor: async (color) => {
        log.info('mock', 'cy_changeStyleColor', color)
      },
      useStyleColor: async (color) => {
        log.info('mock', 'ys_useStyleColor', color)
        return
      },
      useGradient: async (gradient) => {
        log.info('mock', 'ys_useGradient', gradient)
        return
      },
      useStyle: async (item, groupId) => {
        log.info('mock', 'ps_ysBtnUseStyle', { item, groupId })
        return
      },
      getForegroundColor: () =>
        Promise.resolve({
          status: 'ok',
          data: { name: '未命名', color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 } },
        }),
      setForegroundColor: async (color) => {
        log.info('mock', 'ys_setForegroundColor', color)
      },
      getGradientInfo: () => Promise.resolve({ status: 'ok', data: null }),
      setTool: async (tool) => {
        log.info('mock', 'Tool_set', tool)
        return
      },
      addStyle: async (payload) => {
        log.info('mock', 'ys_AddStyle', payload)
      },
    },

    // 常用页域：参数形状与返回结构都未实测，mock 只保证"调用不炸、能看出走到哪一步"
    commonUse: {
      zoom: async (scale) => {
        log.info('mock', 'cy_zoom', scale)
        return
      },
      flip: async (direction) => {
        log.info('mock', 'cy_transformPosition', direction)
        return
      },
      embedImage: async (options) => {
        log.info('mock', 'cy_insertionImage', options)
        return
      },
      embedMultipleImages: async () => {
        log.info('mock', 'cy_embedMultipleImage', null)
        return
      },
      relinkToFile: async (path) => {
        log.info('mock', 'Layer_placedLayerRelinkToFile', path)
        return
      },
      smartToLinkSmartObject: async () => {
        log.info('mock', 'cy_smartToLinkSmartObject', null)
        return
      },
      linkSmartObjectToSmartObject: async () => {
        log.info('mock', 'cy_linkSmartObjectToSmartObject', null)
        return
      },
      importMultipleImages: async (options) => {
        log.info('mock', 'cy_importMultipleImage', options)
        return
      },
      getImagePath: async () => {
        log.info('mock', 'cy_getImagePath', null)
        return { status: 'ok', data: -1 }
      },
      optimizeOnce: async (options) => {
        log.info('mock', 'cy_optimizeDoc', options)
        return
      },
      optimizeFolder: async (options, file) => {
        log.info('mock', 'cy_batchOptimizeDoc', { options, file })
        return
      },
      transform: async (params) => {
        log.info('mock', 'cy_customBuildTransform', params)
        return
      },
      referenceGuide: async (options) => {
        log.info('mock', 'cy_createSafeAreaGuide', options ?? null)
        return
      },
      // 四个无参 jsx：**多传参数就抛**——jsdom 里否则永远是绿的（A1 判据）
      correctBlur: async (...args) => {
        if (args.length) throw new Error('cy_correctRectangleBlur 不接受参数')
        log.info('mock', 'cy_correctRectangleBlur', null)
        return
      },
      layerReplace: async (...args) => {
        if (args.length) throw new Error('cy_LayerReplace 不接受参数')
        log.info('mock', 'cy_LayerReplace', null)
        return
      },
      locationTrade: async (...args) => {
        if (args.length) throw new Error('cy_locationTrade 不接受参数')
        log.info('mock', 'cy_locationTrade', null)
        return
      },
      exchangeLayerColor: async (...args) => {
        if (args.length) throw new Error('cy_exchangeLayerColor 不接受参数')
        log.info('mock', 'cy_exchangeLayerColor', null)
        return
      },
      referenceSlice: async (options) => {
        log.info('mock', 'cy_guideFunction', options ?? null)
        return
      },
      distribute: async (options) => {
        log.info('mock', 'cy_distributedByPitch', options)
        return
      },
      exportPsdImage: async (file, options) => {
        log.info('mock', 'cy_BacthExportPsdToImage', { file, options })
        return
      },
      getPsdList: async () => {
        log.info('mock', 'cy_getPsdForFolder', null)
        return { status: 'ok', data: [] }
      },
    },
  }
}
