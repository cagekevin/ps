import fontsJson from '@/mocks/fonts.json'
import type { FontItem, LayerState, SysFontFile } from './types'

/**
 * 浏览器里的假数据。
 *
 * P3 之后这里只保留 jsx 层还需要的东西（字体列表、图层状态）；
 * 标签/星级由 `data/` 的 memory 实现提供种子，不在这里重复。
 *
 * fonts.json 是从 %APPDATA%\SheJiZhuLi\SysFont2.json 直接拷来的真实数据（259 条），
 * 不是编的——所以浏览器里调出来的列表和 PS 里一致，只是键名要转成页面用的形态。
 */
const file = fontsJson as unknown as SysFontFile

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function getFontList(): Promise<FontItem[]> {
  await wait(300)
  return file.arr.map((f) => ({
    family: f.name,
    weights: f.zz ?? [],
    names: f.mz ?? [],
    postScriptNames: f.hjm ?? [],
    star: 0,
  }))
}

export async function getLayerState(): Promise<LayerState> {
  await wait(80)
  return { hasSelection: true, typeNumber: 2 }
}
