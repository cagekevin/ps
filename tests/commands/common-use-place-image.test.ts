import { describe, expect, it, vi } from 'vitest'
import {
  buildDragInPayload,
  dispatchPlaceImage,
  placeImageAction,
  placeImagePath,
  type PlaceImageDeps,
} from '@/commands/commonUse'
import { listHostEventIds } from '@/cep/events'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * T-97-1c：「置入图片后本页有反应」。
 *
 * 一手依据：官方 `app.v4.js:37606-37615`（注册）、`:37743-37749`（`setEvent` 按开关注册/注销）、
 * `:37750-37757`（`dragInImage`）、`:37758-37761`（`toLinkObject`）。
 */

function deps(options: Record<string, unknown>) {
  const embedImage = vi.fn(async () => null)
  const relinkToFile = vi.fn(async () => null)
  const d: PlaceImageDeps = {
    readOptions: async () => ({ ok: true as const, value: options }),
    embedImage,
    relinkToFile,
  }
  return { d, embedImage, relinkToFile }
}

const PAYLOAD = { eventData: { null: { _path: 'C:\\tmp\\a.png' } } }

describe('置入图片：按两个开关分流', () => {
  it('勾了「拖入图片转成链接智能对象」→ Layer_placedLayerRelinkToFile，路径反斜杠转斜杠', async () => {
    const { d, embedImage, relinkToFile } = deps({ cyOpenDranInToLinkObject: true })

    const action = await dispatchPlaceImage('placeImage', PAYLOAD, d)

    expect(action).toBe('relink')
    expect(relinkToFile).toHaveBeenCalledWith('C:/tmp/a.png')
    expect(embedImage).not.toHaveBeenCalled()
  })

  it('只勾「拖入图片自动嵌入图片」→ cy_insertionImage 的实参（path 空串 + 两个设置原值）', async () => {
    const options = { cyDragInAutoEmbed: true, cyLinkObject: 'original', cyDeleteNext: true }
    const { d, embedImage, relinkToFile } = deps(options)

    const action = await dispatchPlaceImage('placeImage', PAYLOAD, d)

    expect(action).toBe('embed')
    expect(embedImage).toHaveBeenCalledWith({ path: '', bLink2: 'original', bDelete: true })
    expect(relinkToFile).not.toHaveBeenCalled()
  })

  it('都不勾 → 什么都不做', async () => {
    const { d, embedImage, relinkToFile } = deps({})

    const action = await dispatchPlaceImage('placeImage', PAYLOAD, d)

    expect(action).toBe('none')
    expect(embedImage).not.toHaveBeenCalled()
    expect(relinkToFile).not.toHaveBeenCalled()
  })

  it('粘贴 / 剪贴蒙版事件各自认自己的开关（`:37609` / `:37612`），且永不重链', async () => {
    expect(placeImageAction('pasteImage', { cyPasetImageAutoEmbed: true })).toBe('embed')
    expect(placeImageAction('clipMask', { cyClipMaskAutoEmbed: true })).toBe('embed')
    expect(placeImageAction('pasteImage', { cyDragInAutoEmbed: true })).toBe('none')
    expect(placeImageAction('pasteImage', { cyOpenDranInToLinkObject: true })).toBe('none')
  })

  it('路径/实参构造与官方一致（空串 path、设置原值直传）', () => {
    expect(placeImagePath(PAYLOAD)).toBe('C:/tmp/a.png')
    expect(placeImagePath(null)).toBe('')
    expect(buildDragInPayload({ cyLinkObject: 'none', cyDeleteNext: false })).toEqual({
      path: '',
      bLink2: 'none',
      bDelete: false,
    })
  })
})

describe('宿主事件覆盖（防"官方订阅了、我们没订阅"）', () => {
  it('官方常用页 setEvent 用到的每个 ID 都在我方表里', () => {
    const source = readFileSync(
      resolve(__dirname, '../../docs/原版/01-原版源码/panel/js/app.v4.js'),
      'utf8',
    ).split('\n')
    // 官方 CommonUse 组件范围：render 起点 `:35422` 到类结束（下个组件起点 `:38300` 之前）
    const used = new Set<string>()
    for (let i = 35422; i < 38300; i += 1) {
      for (const match of source[i].matchAll(/setEvent\("[^"]+",\s*"(\d+)"/g)) used.add(match[1])
    }
    expect(used.size).toBeGreaterThan(0)

    const ours = new Set(listHostEventIds().map(([, id]) => id))
    const missing = [...used].filter((id) => !ours.has(id))
    expect(missing, `官方订阅了但这些 ID 我方表里没有：${missing.join(', ')}`).toEqual([])
  })
})
