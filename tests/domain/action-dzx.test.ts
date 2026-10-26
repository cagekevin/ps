import { describe, expect, it } from 'vitest'
import { decodeDzx, encodeDzx, remapDzxFileNames } from '@/domain/action-dzx'

const store = {
  index: 0,
  list: [{ name: '默认仓库', fileName: 'sj_dzA.json' }],
}

describe('action .dzx codec', () => {
  it('decode 保留 arrFileData 和 store', () => {
    const file = decodeDzx(
      JSON.stringify({ arrFileData: [{ name: 'sj_dzA.json', data: 'AA==' }], store }),
    )
    expect(file.arrFileData[0].data).toBe('AA==')
    expect(file.store.list[0].name).toBe('默认仓库')
  })

  it('非法 JSON / 缺字段抛错', () => {
    expect(() => decodeDzx('not json')).toThrow(/不是合法的 JSON/)
    expect(() => decodeDzx(JSON.stringify({ store }))).toThrow(/缺少 arrFileData 或 store/)
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
    expect(decodeDzx(text).arrFileData[0].name).toBe('x.json')
  })
})
