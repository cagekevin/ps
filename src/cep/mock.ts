import fontsJson from '@/mocks/fonts.json'
import tagsJson from '@/mocks/font-tags.json'
import type { FontItem, FontTag, LayerState, SysFontFile } from './types'

/**
 * 浏览器里的假数据层。
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

export async function getFontTags(): Promise<FontTag[]> {
  await wait(80)
  return (tagsJson as unknown as FontTag[]).map((t) => ({
    text: t.text,
    arr: t.arr ?? [],
    xz: t.xz === true,
  }))
}

export async function setFont(font: FontItem, variantIndex = 0): Promise<void> {
  await wait(120)
  const weight = font.weights[variantIndex] ?? '?'
  console.info(`[mock] 设置字体 ${font.family} / ${weight}`)
}

export async function getLayerState(): Promise<LayerState> {
  await wait(80)
  return { hasSelection: true, typeNumber: 2 }
}
