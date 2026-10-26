import { describe, expect, it } from 'vitest'
import { decodeDzx, encodeDzx, remapDzxFileNames } from '@/domain/action-dzx'

const store = {
  index: 0,
  list: [{ name: '默认仓库', fileName: 'sj_dzA.json' }],
}

describe('action .dzx codec', () => {
  it('decode 保留 arrFileData 和 store', () => {
    const decoded = decodeDzx(
      JSON.stringify({ arrFileData: [{ name: 'sj_dzA.json', data: 'AA==' }], store }),
    )
    expect(decoded).toMatchObject({
      value: { arrFileData: [{ data: 'AA==' }], store: { list: [{ name: '默认仓库' }] } },
    })
  })

  it('非法 JSON / 缺字段给码（不是抛）', () => {
    expect(decodeDzx('not json')).toEqual({ fail: 'notJson' })
    expect(decodeDzx(JSON.stringify({ store }))).toMatchObject({
      fail: 'shape',
      field: 'arrFileData',
    })
  })

  /**
   * `store.list` 的每一项都要真有 `fileName`：`remapDzxFileNames` 按文件名做映射，
   * 只证"是对象"不够 —— 缺 `fileName` 会在映射时变成 `undefined` 键，导入后索引指向空。
   */
  it('store.list 项缺 fileName → shape 臂（不是当对象收下）', () => {
    expect(
      decodeDzx(JSON.stringify({ arrFileData: [], store: { index: 0, list: [{ name: 'x' }] } })),
    ).toMatchObject({ fail: 'shape', field: 'store.list[].fileName' })
  })

  it('remap 同时改 arrFileData.name 和 store.fileName', () => {
    const file = remapDzxFileNames({
      arrFileData: [{ name: 'sj_dzA.json', data: 'AA==' }],
      store,
    })

    expect(file.arrFileData[0].name).not.toBe('sj_dzA.json')
    expect(file.store.list[0].fileName).toBe(file.arrFileData[0].name)
  })

  it('encode 可被 decode 读回', () => {
    const text = encodeDzx({
      arrFileData: [{ name: 'x.json', data: 'AA==' }],
      store,
    })
    expect(decodeDzx(text)).toMatchObject({ value: { arrFileData: [{ name: 'x.json' }] } })
  })
})
