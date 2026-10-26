import { describe, expect, it } from 'vitest'
import {
  encodeKuContainer,
  encodeKuFlatList,
  encodeKuGroups,
  isSafeKuEntryName,
  parseKuContainer,
  parseKuFlatList,
  parseKuGroups,
  prepareKuAppend,
  remapKuContainer,
  type KuContainerFile,
  type KuGuid,
} from '@/domain/ku-io'
import { isDecodeFail, type DecodeFail, type Decoded } from '@/utils/decode'

/**
 * 库文件编解码（台账 T-48 尾部 / T-57）。
 *
 * 断言只针对**可观察的字节形态**：契约 §0.1 的三种顶层结构、§1.1 的 `data` 编码、
 * §5.2 的「导入必须换新 id」。不测 CEP、不测对话框。
 */
const enc = (text: string) => Buffer.from(text, 'utf8').toString('base64')

/**
 * 取**成功臂**：`remapKuContainer` / `prepareKuAppend` 返回 `Decoded<T> | DecodeFail`。
 * 这些用例只关心成功路径 ⇒ 失败时直接抛（带上 `fail`），不让 `undefined.xxx`
 * 在下一行炸出一句与被测行为无关的话。
 */
function unwrap<T>(out: Decoded<T> | DecodeFail): T {
  if (isDecodeFail(out)) throw new Error(`预期成功，实际失败：${out.fail}`)
  return out.value
}
const dec = (base64: string) => Buffer.from(base64, 'base64').toString('utf8')
const codec = { encode: enc, decode: dec }

/** 固定序列 guid：每次调用换一个 16 位大写 hex，断言不依赖随机值 */
function guidSeq(): KuGuid {
  let n = 0
  return () => (++n).toString(16).toUpperCase().padStart(16, '0')
}

const COLOR_GROUPS = [
  {
    name: '灰白',
    show: true,
    list: [{ name: '未命名', color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 } }],
  },
]
const STYLE_GROUPS = [
  {
    name: '样式默认分组',
    show: true,
    id: 'YS5B2C4C06B1029543',
    list: [{ name: '描边', id: 'ABC123', layerId: 7 }],
  },
]
const GRADIENT_GROUPS = [
  {
    name: '渐变默认分组',
    show: true,
    list: [{ name: '未命名', gradient: { angle: 90, fileName: 'preview.png' } }],
  },
]
const FONT_GROUPS = [{ name: '等线字组', show: true, list: [{ name: '未命名', fonts: [] }] }]

function sampleContainer(): KuContainerFile {
  return {
    arrFileData: [
      { name: 'sj_kuColA2014808B3687D156.ini', data: enc(JSON.stringify(COLOR_GROUPS)) },
      { name: 'sj_kuSty3AAE4E9FB90DE3E13.ini', data: enc(JSON.stringify(STYLE_GROUPS)) },
      { name: 'sj_kuFon4C194C70A627566B.json', data: enc(JSON.stringify(FONT_GROUPS)) },
      { name: 'sj_kuGraAE924AD7B6094003C.ini', data: enc(JSON.stringify(GRADIENT_GROUPS)) },
      { name: 'kuStyle/YS5B2C4C06B1029543.psd', data: false },
      { name: 'kuStyle/ABC123.png', data: false },
      { name: 'Gradient/preview.png', data: false },
    ],
    store: {
      index: 0,
      list: [
        {
          name: '颜色+渐变库-设计助理预设',
          show: { color: false, gradient: true, font: false, style: false },
          color: 'sj_kuColA2014808B3687D156.ini',
          gradient: 'sj_kuGraAE924AD7B6094003C.ini',
          font: 'sj_kuFon4C194C70A627566B.json',
          style: 'sj_kuSty3AAE4E9FB90DE3E13.ini',
        },
      ],
    },
  }
}

describe('三种顶层形态的编解码（契约 §0.1）', () => {
  it('.kuc / .kuf：裸组数组往返，未知键原样保留', () => {
    const text = JSON.stringify(COLOR_GROUPS)
    // 往返两头分开断：解析给 `{ value }`，编码从原数组出发（不靠 `.value` 再取一次）
    expect(parseKuGroups(text)).toEqual({ value: COLOR_GROUPS })
    expect(encodeKuGroups(COLOR_GROUPS)).toBe(text)

    const withUnknown = [{ name: '组', show: true, list: [], 未来字段: { a: 1 } }]
    expect(parseKuGroups(JSON.stringify(withUnknown))).toMatchObject({
      value: [{ 未来字段: { a: 1 } }],
    })
  })

  it('.kus / .kug：扁平清单往返，data:false 不丢也不改成空串', () => {
    const entries = [
      { name: 'sj_kuStyC1F3475497B91DB2.ini', data: enc(JSON.stringify(STYLE_GROUPS)) },
      { name: 'kuStyle/YS5B2C4C06B1029543.psd', data: false as const },
    ]

    expect(parseKuFlatList(encodeKuFlatList(entries))).toEqual({ value: entries })
  })

  it('.kux：容器往返，store 原样保留', () => {
    const file = sampleContainer()
    const text = encodeKuContainer(file)
    expect(text.startsWith('{"arrFileData":')).toBe(true)

    expect(parseKuContainer(text)).toMatchObject({
      value: { store: file.store, arrFileData: file.arrFileData },
    })
    expect(encodeKuContainer(file)).toBe(text)
  })

  /**
   * 失败是**可枚举的码**（`shape` + 字段名 / `emptyContent` / `notJson`），不是一句中文 throw：
   * 中文由 `describeDecodeFail` 渲染，解析层只说它真正知道的东西。
   */
  it('容器缺 arrFileData / store.list 时给码，不静默当空库', () => {
    expect(parseKuContainer('{}')).toMatchObject({ fail: 'shape', field: 'arrFileData' })
    expect(parseKuContainer('{"arrFileData":[]}')).toMatchObject({ fail: 'shape', field: 'store' })
    expect(parseKuContainer('{"arrFileData":[],"store":{"index":0,"list":[]}}')).toEqual({
      fail: 'emptyContent',
    })
    expect(parseKuContainer('[]')).toMatchObject({ fail: 'shape', expected: 'object' })
    expect(parseKuContainer('not json')).toEqual({ fail: 'notJson' })
  })

  it('库文件里有非对象组时给码', () => {
    expect(parseKuGroups('[1]')).toMatchObject({ fail: 'badItem' })
    expect(parseKuGroups('{"name":"x"}')).toMatchObject({ fail: 'shape', expected: 'array' })
  })
})

describe('导入时的 id 重写（契约 §5.2 第 3 点）', () => {
  it('.kux 容器：库文件名 / 样式组与项 id / 渐变预览图一起换新，store 引用同步', () => {
    const guid = guidSeq()
    const remapped = unwrap(remapKuContainer(sampleContainer(), guid, codec))

    const names = remapped.arrFileData.map((entry) => entry.name)
    // 库文件名：同前缀 + 16 位大写 hex + 原扩展名
    expect(names[0]).toMatch(/^sj_kuCol[0-9A-F]{16}\.ini$/)
    expect(names[0]).not.toBe('sj_kuColA2014808B3687D156.ini')
    expect(names[2]).toMatch(/^sj_kuFon[0-9A-F]{16}\.json$/)

    const style = JSON.parse(dec(remapped.arrFileData[1].data as string)) as Array<{
      id: string
      list: Array<{ id: string; layerId: number }>
    }>
    expect(style[0].id).toMatch(/^YS[0-9A-F]{16}$/)
    expect(style[0].id).not.toBe('YS5B2C4C06B1029543')
    expect(style[0].list[0].id).toMatch(/^[0-9A-F]{16}$/)
    expect(style[0].list[0].id).not.toBe('ABC123')
    // layerId 是 PS 图层 id，不是文件 id，不许动
    expect(style[0].list[0].layerId).toBe(7)

    // 旁路图跟着组 / 项 id 改名
    expect(names).toContain(`kuStyle/${style[0].id}.psd`)
    expect(names).toContain(`kuStyle/${style[0].list[0].id}.png`)

    const gradient = JSON.parse(dec(remapped.arrFileData[3].data as string)) as Array<{
      list: Array<{ gradient: { fileName: string } }>
    }>
    const fileName = gradient[0].list[0].gradient.fileName
    expect(fileName).toMatch(/^[0-9A-F]{16}\.png$/)
    expect(fileName).not.toBe('preview.png')
    expect(names).toContain(`Gradient/${fileName}`)

    // store 的四个字段指向新库文件名
    const warehouse = remapped.store.list[0]
    expect(warehouse.color).toBe(names[0])
    expect(warehouse.style).toBe(names[1])
    expect(warehouse.font).toBe(names[2])
    expect(warehouse.gradient).toBe(names[3])
  })

  it('data:false 的旁路项保持 false，不变成空串也不解码', () => {
    const remapped = unwrap(remapKuContainer(sampleContainer(), guidSeq(), codec))
    const sidecars = remapped.arrFileData.filter((entry) => !entry.name.startsWith('sj_ku'))
    expect(sidecars).toHaveLength(3)
    for (const entry of sidecars) expect(entry.data).toBe(false)
  })

  it('重复 id 只换一次（同一组的 psd 与库里的 id 对得上）', () => {
    const groups = [
      {
        name: '组',
        show: true,
        id: 'YSAAAAAAAAAAAAAAAA',
        list: [{ name: '项', id: 'BBBBBBBBBBBBBBBB', layerId: 1 }],
      },
    ]
    const payload = unwrap(
      prepareKuAppend(
        'style',
        groups,
        [{ name: 'kuStyle/YSAAAAAAAAAAAAAAAA.psd', data: false }],
        guidSeq(),
      ),
    )

    expect(payload.groups[0].id).toMatch(/^YS[0-9A-F]{16}$/)
    expect(payload.sidecars[0].name).toBe(`kuStyle/${String(payload.groups[0].id)}.psd`)
  })

  it('单库追加：没被库引用的旁路图也换名，避免覆盖本地', () => {
    const payload = unwrap(
      prepareKuAppend(
        'style',
        STYLE_GROUPS,
        [{ name: 'kuStyle/FFFFFFFFFFFFFFFF.png', data: 'AAAA' }],
        guidSeq(),
      ),
    )

    expect(payload.sidecars[0].name).toMatch(/^kuStyle\/[0-9A-F]{16}\.png$/)
    expect(payload.sidecars[0].name).not.toBe('kuStyle/FFFFFFFFFFFFFFFF.png')
    expect(payload.sidecars[0].data).toBe('AAAA')
  })
})

describe('导入文件名安全', () => {
  it('只放行库文件名与 kuStyle/、Gradient/ 下一层文件', () => {
    expect(isSafeKuEntryName('sj_kuStyA.ini')).toBe(true)
    expect(isSafeKuEntryName('kuStyle/YS1.psd')).toBe(true)
    expect(isSafeKuEntryName('Gradient/a.png')).toBe(true)
    expect(isSafeKuEntryName('../evil.json')).toBe(false)
    expect(isSafeKuEntryName('kuStyle/../evil.png')).toBe(false)
    expect(isSafeKuEntryName('sj_kuStyA/../x.ini')).toBe(false)
    expect(isSafeKuEntryName('other/a.png')).toBe(false)
  })
})
