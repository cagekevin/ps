import { describe, expect, it } from 'vitest'
import { readKuGroups, readStyleWarehouseIndex } from '@/domain/style-library'

function decode(base64: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))
}

describe('仓库索引归一化', () => {
  it('读数 + 保留未知键（原面板可能写了我们不知道的字段）', () => {
    const read = readStyleWarehouseIndex({
      index: 1,
      list: [
        { name: 'kevin', color: 'sj_kuCol1.ini', 自定义: '保留' },
        { name: '预设', show: { color: false }, gradient: 'sj_kuGra1.ini' },
      ],
    })
    expect(read.degraded).toBe('')
    expect(read.value.index).toBe(1)
    expect(read.value.list[0]).toMatchObject({ name: 'kevin', 自定义: '保留' })
  })

  it('index 越界夹回合法范围', () => {
    const read = readStyleWarehouseIndex({ index: 9, list: [{ name: 'a' }] })
    expect(read.value.index).toBe(0)
  })

  it('结构不认识 → 带 degraded，不静默成"新用户"', () => {
    expect(readStyleWarehouseIndex(null).degraded).toBeTruthy()
    expect(readStyleWarehouseIndex({ list: 'x' }).degraded).toBeTruthy()
    expect(readStyleWarehouseIndex({ index: 0, list: [] }).degraded).toBeTruthy()
  })
})

describe('四类库的项归一化', () => {
  it('颜色项：hex → #色块', () => {
    const text = JSON.stringify([
      { name: '灰白', show: true, list: [{ name: '未命名', color: { hex: '302F34', c: 81 } }] },
    ])
    const read = readKuGroups('color', text, decode)
    expect(read.note).toBe('')
    expect(read.groups[0]).toMatchObject({ name: '灰白', show: true })
    expect(read.groups[0].items[0]).toMatchObject({ name: '未命名', swatch: '#302F34' })
  })

  /**
   * 用真样本值断言：`sj_kuGra6A784C90B4183F79.ini`（契约 §2.3）的 location 是 0 / 1997 / 4070，
   * angle = 90。换算规则照原版 `getGradientArr`（`app.v4.js:50724-50726`）：
   * `location / 4096 * 100`（不四舍五入）+ `90 + angle`。
   * 之前直接 `Math.round(location)%` 会拼出 `#E5D6BD 1997%`，浏览器只画最前面一小段 → 看着是纯色块。
   */
  it('渐变项：location 按 0–4096 刻度换算、角度 90+angle（真实样本值）', () => {
    const text = JSON.stringify([
      {
        name: '渐变默认分组',
        show: true,
        list: [
          {
            name: '未命名',
            gradient: {
              angle: 90,
              gradient: {
                colors: [
                  { location: 0, color: { hexValue: 'D8C09E' } },
                  { location: 1997, color: { hexValue: 'E5D6BD' } },
                  { location: 4070, color: { hexValue: 'D2BA94' } },
                ],
                transparency: [
                  { location: 0, opacity: 100 },
                  { location: 4096, opacity: 0 },
                ],
              },
            },
          },
        ],
      },
    ])
    const read = readKuGroups('gradient', text, decode)

    // 0/4096*100=0、1997/4096*100=48.7548828125、4070/4096*100=99.365234375；90+90=180
    expect(read.groups[0].items[0].swatch).toBe(
      'linear-gradient(180deg, #D8C09E 0%, #E5D6BD 48.7548828125%, #D2BA94 99.365234375%)',
    )
  })

  it('渐变项：transparency 不进 CSS（原版 getGradientArr 只取 colors）', () => {
    const text = JSON.stringify([
      {
        name: 'g',
        show: true,
        list: [
          {
            name: '未命名',
            gradient: {
              angle: 0,
              gradient: {
                colors: [
                  { location: 0, color: { hexValue: '000000' } },
                  { location: 4096, color: { hexValue: 'FFFFFF' } },
                ],
                transparency: [{ location: 0, opacity: 100 }],
              },
            },
          },
        ],
      },
    ])
    const read = readKuGroups('gradient', text, decode)

    // 4096/4096*100 = 100；90+0 = 90deg
    expect(read.groups[0].items[0].swatch).toBe('linear-gradient(90deg, #000000 0%, #FFFFFF 100%)')
  })

  it('渐变项：angle 不是数字时不给色块，不猜 90', () => {
    const text = JSON.stringify([
      {
        name: 'g',
        show: true,
        list: [
          {
            name: '未命名',
            gradient: { gradient: { colors: [{ location: 0, color: { hexValue: '000000' } }] } },
          },
        ],
      },
    ])
    const read = readKuGroups('gradient', text, decode)
    expect(read.groups[0].items[0].swatch).toBeUndefined()
  })

  it('渐变项：有 fileName 时透出 image（原版改走 <img>，app.v4.js:50558-50562）', () => {
    const text = JSON.stringify([
      {
        name: 'g',
        show: true,
        list: [
          {
            name: '未命名',
            gradient: {
              fileName: 'abc.png',
              angle: 90,
              gradient: {
                colors: [
                  { location: 0, color: { hexValue: '000000' } },
                  { location: 4096, color: { hexValue: 'FFFFFF' } },
                ],
              },
            },
          },
        ],
      },
    ])
    const read = readKuGroups('gradient', text, decode)

    // 两种都给：页面优先 <img>，图挂了才退回 CSS 渐变
    expect(read.groups[0].items[0].image).toBe('abc.png')
    expect(read.groups[0].items[0].swatch).toBe('linear-gradient(180deg, #000000 0%, #FFFFFF 100%)')
  })

  it('字体项：fonts[0] 的 family + size（数字与字符串两种都收）', () => {
    const text = JSON.stringify([
      {
        name: '等线字组',
        show: true,
        list: [{ name: '未命名', fonts: [{ family: '等线', size: '20' }] }],
      },
    ])
    const read = readKuGroups('font', text, decode)
    expect(read.groups[0].items[0].meta).toBe('等线 · 20点')
  })

  it('样式项：只认 {name,id,layerId}，多出来的键不猜', () => {
    const text = JSON.stringify([
      {
        name: '样式默认分组',
        show: true,
        id: 'YS1',
        list: [{ name: '描边', id: 'X1', layerId: 3, 未知: 1 }],
      },
    ])
    const read = readKuGroups('style', text, decode)
    expect(read.groups[0].items[0]).toEqual({ name: '描边' })
  })

  it('不是合法 JSON → 给 note（读失败不能伪装成空库）', () => {
    const read = readKuGroups('color', '{坏文件', decode)
    expect(read.groups).toHaveLength(0)
    expect(read.note).toContain('不是合法 JSON')
  })
})
