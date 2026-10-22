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

/**
 * 库文件编解码（台账 T-48 尾部 / T-57）。
 *
 * 断言只针对**可观察的字节形态**：契约 §0.1 的三种顶层结构、§1.1 的 `data` 编码、
 * §5.2 的「导入必须换新 id」。不测 CEP、不测对话框。
 */
const enc = (text: string) => Buffer.from(text, 'utf8').toString('base64')
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
    expect(encodeKuGroups(parseKuGroups(text))).toBe(text)

    const withUnknown = [{ name: '组', show: true, list: [], 未来字段: { a: 1 } }]
    expect(parseKuGroups(JSON.stringify(withUnknown))[0].未来字段).toEqual({ a: 1 })
  })

  it('.kus / .kug：扁平清单往返，data:false 不丢也不改成空串', () => {
    const entries = [
      { name: 'sj_kuStyC1F3475497B91DB2.ini', data: enc(JSON.stringify(STYLE_GROUPS)) },
      { name: 'kuStyle/YS5B2C4C06B1029543.psd', data: false as const },
    ]

    const parsed = parseKuFlatList(encodeKuFlatList(entries))
    expect(parsed).toEqual(entries)
    expect(parsed[1].data).toBe(false)
  })

  it('.kux：容器往返，store 原样保留', () => {
    const file = sampleContainer()
    const text = encodeKuContainer(file)
    expect(text.startsWith('{"arrFileData":')).toBe(true)

    const parsed = parseKuContainer(text)
    expect(parsed.store).toEqual(file.store)
    expect(parsed.arrFileData).toEqual(file.arrFileData)
    expect(encodeKuContainer(parsed)).toBe(text)
  })

  it('容器缺 arrFileData / store.list 时报错，不静默当空库', () => {
    expect(() => parseKuContainer('{}')).toThrow('arrFileData')
    expect(() => parseKuContainer('{"arrFileData":[]}')).toThrow('store.list')
    expect(() => parseKuContainer('{"arrFileData":[],"store":{"index":0,"list":[]}}')).toThrow(
      'store.list 是空的',
    )
    expect(() => parseKuContainer('[]')).toThrow('不是仓库容器')
    expect(() => parseKuContainer('not json')).toThrow('不是合法的 JSON')
  })

  it('库文件里有非对象组时报错', () => {
    expect(() => parseKuGroups('[1]')).toThrow('非对象')
    expect(() => parseKuGroups('{"name":"x"}')).toThrow('不是数组')
  })
})

describe('导入时的 id 重写（契约 §5.2 第 3 点）', () => {
  it('.kux 容器：库文件名 / 样式组与项 id / 渐变预览图一起换新，store 引用同步', () => {
    const guid = guidSeq()
    const remapped = remapKuContainer(sampleContainer(), guid, codec)

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
    const remapped = remapKuContainer(sampleContainer(), guidSeq(), codec)
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
    const payload = prepareKuAppend(
      'style',
      groups,
      [{ name: 'kuStyle/YSAAAAAAAAAAAAAAAA.psd', data: false }],
      guidSeq(),
    )

    expect(payload.groups[0].id).toMatch(/^YS[0-9A-F]{16}$/)
    expect(payload.sidecars[0].name).toBe(`kuStyle/${String(payload.groups[0].id)}.psd`)
  })

  it('单库追加：没被库引用的旁路图也换名，避免覆盖本地', () => {
    const payload = prepareKuAppend(
      'style',
      STYLE_GROUPS,
      [{ name: 'kuStyle/FFFFFFFFFFFFFFFF.png', data: 'AAAA' }],
      guidSeq(),
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
