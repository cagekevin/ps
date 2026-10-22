import { getFontList } from '@/cep/mock'
import { log } from '@/utils/logger'
import type { JsxPort } from './types'

// 是什么：jsx 在浏览器里的假实现
// 唯一入口：与真实实现共用 JsxPort；漏一个函数编译失败
// 替代了什么：旧 `ps.ts` 里的 `if (!hasCep())` 双路径
// 谁在用：createJsxPort(false)（dev / 测试）
// 禁止：只有这里能返回假数据；命令层不要判断环境

const ok = () => Promise.resolve(null)

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
      initSystemList: () => getFontList(),

      setFont: async (postScriptName, name, weight) => {
        log.info('mock', `设置字体 ${name} / ${weight}（${postScriptName}）`)
        return null
      },

      getTypeUnits: () => Promise.resolve('TypeUnits.POINTS'),
      getFontSimpleInfo: () => Promise.resolve({ err: 0, data: { ...FONT_INFO } }),
      getCurrentFontInfo: () =>
        Promise.resolve({
          err: 0,
          data: {
            family: '思源黑体 CN',
            name: 'Source Han Sans CN Regular',
            scriptName: 'SourceHanSansCN-Regular',
          },
        }),
      getCurrentText: () =>
        Promise.resolve({ err: 0, data: [{ text: '设计助理' }, { text: 'Design Assistant' }] }),
      getFontInfo: () =>
        Promise.resolve({
          err: 0,
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

      setNumberSize: ok,
      setHierarchySize: ok,
      setLeading: ok,
      setTracking: ok,
      setColor: () => Promise.resolve({ err: 0, data: { rgb: { r: 110, g: 120, b: 255 } } }),
      setFontName: async (postScriptName, name) => {
        log.info('mock', `字体面板换字体 ${name}（${postScriptName}）`)
        return null
      },
      setAllCaps: ok,
      setFontVision: ok,
      setFauxItalic: ok,
      setFauxBold: ok,
      setJustified: ok,
      setTextAlignment: ok,
      setHorizontalCenters: ok,
      setVerticalCenter: ok,
      setTextUpDownAlign: ok,
      setBackgroundAlign: ok,
      alignHorizontal: ok,
      distributeByPitch: ok,

      changeTextBranchMerge: ok,
      textBranchMerge: ok,
      createButton: ok,
      checkUseFont: () => Promise.resolve({ err: 0 }),
      useFont: ok,
      switchFontDirection: ok,
      setTranslateText: ok,
    },

    layer: {
      isSelectLayer: () => Promise.resolve(true),
      getTypeNumber: () => Promise.resolve(2),
    },

    env: {
      setEnv: () => Promise.resolve(),
    },

    action: {
      // 与真实 dz_getActionList 同形：{ name, children:[{ name }] }
      getActionList: () =>
        Promise.resolve([
          { name: '修图', children: [{ name: '一键磨皮' }] },
          { name: '新建文档', children: [{ name: '800x800' }] },
        ]),

      callAction: async (item) => {
        log.info('mock', `执行动作 ${item.group} / ${item.name}`)
        return null
      },
    },

    legacy: {
      call: async (key, args) => {
        log.info('mock', `执行旧自由面板 key ${key}`, args)
        return null
      },
    },
  }
}
