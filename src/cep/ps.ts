import { CepError, ERR_PREFIX, evalScriptRaw, hasCep, jsxCall } from './eval-script'
import { DATA_FILES, PS_ENV } from './env'
import { extensionDir, hasNode, readTextFile, readTextSmart, userDir } from './fs'
import { jsonFile } from './json-file'
import type { FontItem, FontTag, LayerState, SysFontFile } from './types'
import * as mock from './mock'

let initPromise: Promise<void> | null = null

/**
 * 加载 jsx 并注入环境变量，成功一次后不再执行。
 * 失败会把缓存清掉，允许重试。
 */
export function initJsx(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit().catch((e) => {
      initPromise = null
      throw e
    })
  }
  return initPromise
}

async function doInit(): Promise<void> {
  if (!hasCep()) return

  const dir = extensionDir()
  if (!dir) throw new CepError('INIT', '拿不到扩展目录（getSystemPath("extension") 失败）')

  const jsxPath = `${dir}/lib/all.decrypted.js`

  // 必须是顶层语句，不能包在 IIFE 里：$.evalFile 继承调用处的作用域，
  // 包进函数后 jsxbin 定义的函数会落在局部作用域，函数返回即销毁。
  const loadRes = await evalScriptRaw(
    `try { $.evalFile("${jsxPath}"); "OK" } catch (e) { "${ERR_PREFIX}" + e.message }`,
    30000,
  )
  if (loadRes !== 'OK') {
    throw new CepError('INIT', `加载 jsx 失败：${loadRes.replace(ERR_PREFIX, '')}`)
  }

  const typeRes = await evalScriptRaw('typeof ztgl_initSystemList')
  if (typeRes !== 'function') {
    const diag = await evalScriptRaw(
      `(function(){var f = new File("${jsxPath}");` +
        `return [f.exists ? 'exists' : 'missing', typeof Sys_setSystemEnvInfo, typeof app].join('|');})()`,
      10000,
    ).catch(() => '诊断脚本也失败了')
    throw new CepError('INIT', `jsx 已加载，但 ztgl_initSystemList 不可用（typeof = ${typeRes}；${diag}）`)
  }

  // 不注入环境变量，jsx 内部拼路径时会报「undefined 不是对象」
  await jsxCall('Sys_setSystemEnvInfo', [JSON.stringify(PS_ENV)], { label: '注入环境变量', timeout: 15000 })
}

/**
 * 读字体列表。
 *
 * ztgl_initSystemList() 实测直接返回字体数组（family/weights/names/postScriptNames）。
 * 有些版本会返回状态字符串 "ok"、数据写到 SysFont2.json，所以两种都兜住。
 */
export async function getFontList(opts: { refresh?: boolean } = {}): Promise<FontItem[]> {
  if (!hasCep()) return mock.getFontList()

  await initJsx()

  if (!opts.refresh) {
    const cached = await readSysFontFile()
    if (cached.length) return cached
  }

  const res = await jsxCall<unknown>('ztgl_initSystemList', [], { label: '读取系统字体', timeout: 120000 })

  if (res === 'ok') {
    const fromFile = await readSysFontFile()
    if (!fromFile.length) {
      throw new CepError('PARSE', 'ztgl_initSystemList 返回 ok，但读不到 SysFont2.json')
    }
    return fromFile
  }

  const list = normalizeList(res)
  if (!list.length) {
    throw new CepError('PARSE', `ztgl_initSystemList 返回了无法识别的数据：${String(res).slice(0, 120)}`)
  }
  return mergeStars(list)
}

interface RawTag {
  text?: string
  arr?: string[]
  xz?: boolean
}

interface RawStar {
  name?: string
  star?: string | number
}

/** 星级收藏文件（原面板 sj_ztglStar.ini） */
const STAR_FILE = 'sj_ztglStar.ini'

const tagFile = jsonFile<RawTag[]>(DATA_FILES.ztglTags, () => [])
const starFile = jsonFile<RawStar[]>(STAR_FILE, () => [])

/** 读字体标签（我的标签那一排） */
export async function getFontTags(): Promise<FontTag[]> {
  if (!hasCep()) return mock.getFontTags()

  const raw = await tagFile.read()
  return raw
    .filter((item) => typeof item.text === 'string')
    .map((item) => ({
      text: item.text as string,
      arr: Array.isArray(item.arr) ? item.arr : [],
      xz: item.xz === true,
    }))
}

/** 读星级：{ 家族名: 1~3 } */
export async function getFontStars(): Promise<Record<string, number>> {
  if (!hasCep()) return mock.getFontStars()

  const raw = await starFile.read()
  const map: Record<string, number> = {}
  for (const item of raw) {
    if (typeof item.name !== 'string') continue
    const value = Number(item.star)
    if (value > 0) map[item.name] = value
  }
  return map
}

/**
 * 写星级。注意原文件里 star 有的是字符串 "3" 有的是数字 3，统一写数字。
 * 写之前先备份成 .bak，避免写坏原面板的数据。
 */
export async function setFontStar(family: string, star: number): Promise<void> {
  if (!hasCep()) return mock.setFontStar(family, star)

  await starFile.update((raw) => {
    const list = raw
      .filter((item) => typeof item.name === 'string')
      .map((item) => ({ name: item.name as string, star: Number(item.star) || 0 }))

    if (star <= 0) return list.filter((item) => item.name !== family)

    const hit = list.find((item) => item.name === family)
    if (hit) hit.star = star
    else list.push({ name: family, star })
    return list
  })
}

/** 给字体加/去某个标签，写回 sj_ztglTags.ini */
export async function toggleFontTag(tagText: string, family: string): Promise<void> {
  if (!hasCep()) return mock.toggleFontTag(tagText, family)

  await tagFile.update((list) => {
    const tag = list.find((item) => item.text === tagText)
    if (!tag) return

    const arr = Array.isArray(tag.arr) ? tag.arr : []
    const index = arr.indexOf(family)
    if (index >= 0) arr.splice(index, 1)
    else arr.push(family)
    tag.arr = arr
  })
}

/** 把字体设到当前选中的图层上，variantIndex 对应 weights/names/postScriptNames 的下标 */
export async function setFont(font: FontItem, variantIndex = 0): Promise<void> {
  if (!hasCep()) return mock.setFont(font, variantIndex)

  await initJsx()

  // 先拦一道：没选中图层就别去调 jsx 了，否则只会拿到一句看不懂的 EvalScript error
  const state = await getLayerState()
  if (!state.hasSelection) {
    throw new CepError('NO_SELECTION', '请先选择一个文字图层')
  }

  const postScriptName = font.postScriptNames[variantIndex]
  const name = font.names[variantIndex] ?? font.family
  const weight = font.weights[variantIndex] ?? 'Regular'
  if (!postScriptName) {
    throw new CepError('PARSE', `${font.family} 没有第 ${variantIndex + 1} 个字重的 PostScript 名`)
  }

  // 参数顺序对齐原面板：jsx("ztgl_setFont", [hjm, mz, zz])
  await jsxCall('ztgl_setFont', [postScriptName, name, weight], {
    label: `设置字体 ${font.family}`,
    timeout: 20000,
  })
}

/** 当前选中图层状态 */
export async function getLayerState(): Promise<LayerState> {
  if (!hasCep()) return mock.getLayerState()

  await initJsx()

  const selected = await jsxCall<unknown>('Layer_isSelectLayer', [], { label: '查询是否有选中图层', timeout: 10000 })
  const typeNumber = await jsxCall<unknown>('Layer_getTypeNumber', [], { label: '查询图层类型', timeout: 10000 })

  return {
    hasSelection: selected === true || String(selected) === 'true',
    typeNumber: Number(typeNumber) || 0,
  }
}

/** 运行时信息，面板底部和排查问题时用 */
export function runtimeInfo() {
  const inCep = hasCep()
  let dir = ''
  if (inCep && hasNode()) {
    try {
      dir = userDir()
    } catch {
      dir = ''
    }
  }
  return {
    inCep,
    hasNode: hasNode(),
    extensionDir: inCep ? extensionDir() : '',
    userDir: dir,
  }
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v))
  if (typeof value === 'string') return [value]
  return []
}

/** 兼容两套键名：family/weights/names/postScriptNames 与 name/zz/mz/hjm */
function normalizeFont(item: unknown): FontItem | null {
  if (!item || typeof item !== 'object') return null
  const f = item as Record<string, unknown>

  const family =
    typeof f.family === 'string' ? f.family : typeof f.name === 'string' ? f.name : ''
  if (!family) return null

  return {
    family,
    weights: asArray(f.weights ?? f.zz),
    names: asArray(f.names ?? f.mz),
    postScriptNames: asArray(f.postScriptNames ?? f.hjm),
    star: typeof f.star === 'number' ? f.star : 0,
  }
}

function normalizeList(raw: unknown): FontItem[] {
  if (!Array.isArray(raw)) return []
  const out: FontItem[] = []
  for (const item of raw) {
    const font = normalizeFont(item)
    if (font) out.push(font)
  }
  return out
}

async function readSysFontFile(): Promise<FontItem[]> {
  const abs = `${userDir()}/${DATA_FILES.sysFontList}`
  const text = await readTextSmart(abs)
  if (!text) return []
  try {
    const file = JSON.parse(text) as SysFontFile
    return mergeStars(normalizeList(file.arr))
  } catch {
    return []
  }
}

/** 把收藏等级合并进去（缺文件就当全是 0） */
function mergeStars(list: FontItem[]): FontItem[] {
  const stars = readStars()
  if (!Object.keys(stars).length) return list
  return list.map((f) => ({ ...f, star: stars[f.family] ?? 0 }))
}

function readStars(): Record<string, number> {
  const text = readTextFile(`${userDir()}/${DATA_FILES.ztglStar}`)
  if (!text) return {}
  try {
    const arr = JSON.parse(text) as Array<{ name?: string; star?: number }>
    const map: Record<string, number> = {}
    for (const item of arr) {
      if (item?.name) map[item.name] = item.star ?? 0
    }
    return map
  } catch {
    return {}
  }
}
