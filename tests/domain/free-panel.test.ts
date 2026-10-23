import { describe, expect, it } from 'vitest'
import {
  createEmptyFreePanel,
  findBlock,
  normalizeFreePanel,
  readFreePanelFile,
  walkBlocks,
} from '@/domain/free-panel'

const realShape = {
  uid: 2,
  btnId: 12,
  obj: {
    version: '1.0',
    type: 'row',
    list: [
      {
        id: 1,
        zIndex: 0,
        showIcon: false,
        showNumber: 2,
        type: 'norow',
        width: '100%',
        height: '100%',
        children: [
          {
            id: 3,
            zIndex: 1,
            showIcon: false,
            showNumber: 2,
            type: 'row',
            children: [],
            data: [],
          },
        ],
        data: [
          {
            icon: '',
            type: '',
            key: 'dz_useAction',
            btnId: 12,
            text: 'ps批量导出',
            funcText: '',
            option: { group: '常用', name: 'ps批量导出' },
            left: '',
            top: '',
            position: false,
          },
        ],
      },
    ],
  },
}

describe('free-panel domain', () => {
  it('读真实 {uid,btnId,obj} 结构，不丢 block/data', () => {
    const file = normalizeFreePanel(realShape)

    expect(file.uid).toBe(2)
    expect(file.btnId).toBe(12)
    expect(file.obj.list).toHaveLength(1)
    expect(file.obj.list[0].data[0]).toMatchObject({
      text: 'ps批量导出',
      key: 'dz_useAction',
      option: { group: '常用', name: 'ps批量导出' },
    })
  })

  it('findBlock 能进 children', () => {
    const file = normalizeFreePanel(realShape)
    expect(findBlock(file.obj.list, 3)?.id).toBe(3)
  })

  it('walkBlocks 覆盖根和子块', () => {
    const file = normalizeFreePanel(realShape)
    const ids: number[] = []
    walkBlocks(file.obj.list, (block) => {
      ids.push(block.id)
    })
    expect(ids).toEqual([1, 3])
  })

  it('保留 option:null 和未知字段', () => {
    const file = normalizeFreePanel({
      uid: 2,
      btnId: 2,
      extraTop: 1,
      obj: {
        version: '1.0',
        type: 'row',
        extraObj: 2,
        list: [
          {
            id: 1,
            zIndex: 0,
            showIcon: false,
            showNumber: 2,
            type: 'norow',
            extraBlock: 3,
            children: [],
            data: [
              {
                icon: '',
                type: '',
                key: 'cy_exportOpenFolder',
                btnId: 1,
                text: '打开',
                funcText: '',
                option: null,
                left: '',
                top: '',
                position: false,
                extraItem: 4,
              },
            ],
          },
        ],
      },
    })

    expect(file.extraTop).toBe(1)
    expect(file.obj.extraObj).toBe(2)
    expect(file.obj.list[0].extraBlock).toBe(3)
    expect(file.obj.list[0].data[0].option).toBeNull()
    expect(file.obj.list[0].data[0].extraItem).toBe(4)
  })

  it('空 list 保持为空，不强制补 block', () => {
    const file = normalizeFreePanel({
      uid: 0,
      btnId: 0,
      obj: { version: '1.0', type: 'row', list: [] },
    })
    expect(file.obj.list).toEqual([])
  })

  it('空文件回退到一个空 block', () => {
    const file = normalizeFreePanel(null)
    expect(file.obj.list).toHaveLength(1)
    expect(file.obj.list[0].data).toEqual([])
    expect(createEmptyFreePanel().uid).toBe(1)
  })
})

/**
 * T-99-2：读边界归一器。它和 `normalizeFreePanel` 共用同一份形状判据，
 * 唯一区别是**形状不认识时返回 `null`**（由 repo 转成 degraded），不补空面板。
 */
describe('readFreePanelFile', () => {
  it('认得真实形状：交给 normalizeFreePanel 归一', () => {
    const file = readFreePanelFile(realShape)
    expect(file?.obj.list).toHaveLength(1)
    expect(file?.obj.list[0].data[0].text).toBe('ps批量导出')
  })

  it('缺 obj / obj.list 不是数组 / 顶层不是对象 → null（不静默补默认面板）', () => {
    expect(readFreePanelFile({})).toBeNull()
    expect(readFreePanelFile({ obj: { list: '不是数组' } })).toBeNull()
    expect(readFreePanelFile({ obj: null })).toBeNull()
    expect(readFreePanelFile(null)).toBeNull()
    expect(readFreePanelFile([{ id: 1 }])).toBeNull()
    expect(readFreePanelFile('{}')).toBeNull()
  })

  it('空 list 是合法状态：不返回 null', () => {
    const file = readFreePanelFile({
      uid: 0,
      btnId: 0,
      obj: { version: '1.0', type: 'row', list: [] },
    })
    expect(file?.obj.list).toEqual([])
  })
})
