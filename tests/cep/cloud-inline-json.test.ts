import { describe, expect, it } from 'vitest'
import { decodeInlineJson, inlineFile, unitPayload } from '@/cep/cloud/entries/util'
import { fontTagsEntry } from '@/cep/cloud/entries/font-tags'
import { msg } from '@/domain/messages'
import type { SyncFile } from '@/domain/cloud'

/**
 * 云载荷内层 `file.content.data` 的**唯一解析入口**（TD-18-115）。
 *
 * 为什么单开一个文件：这段内容与磁盘坏文件**信任级别相同**（都是不可信的），
 * 收口前 `entries/util.ts` 与 `entries/action-library.ts` 各写一份 `JSON.parse` + 各写一句中文 throw。
 * 收口后判据只剩 `decodeInlineJson` 一处，文案只剩 `describeDecodeFail` 一处。
 *
 * 判据：坏载荷时**失败臂取不到值**（`'value' in out === false`），且用户看到的文案来自 `msg`，
 * 不是 entry 里手写的那句。
 */
describe('decodeInlineJson · 云载荷内层唯一解析入口', () => {
  it('合法 JSON → 成功臂带值', () => {
    expect(decodeInlineJson(inlineFile('/a.json', '{"a":1}'))).toEqual({ value: { a: 1 } })
  })

  it('没有文件 / 不是内联内容 → emptyContent（不是形状错，也不是读不到）', () => {
    expect(decodeInlineJson(undefined)).toEqual({ fail: 'emptyContent' })

    const notInline = {
      path: '/a',
      size: 1,
      content: { kind: 'blob', url: 'https://x' },
    } as unknown as SyncFile
    expect(decodeInlineJson(notInline)).toEqual({ fail: 'emptyContent' })
  })

  it('内层不是合法 JSON → notJson，且失败臂取不到 value', () => {
    const out = decodeInlineJson(inlineFile('/a.json', '{坏'))

    expect(out).toEqual({ fail: 'notJson' })
    expect('value' in out).toBe(false)
  })
})

describe('entry 写回：坏载荷 → ok:false，文案来自 msg', () => {
  it('font.tags 的载荷不是合法 JSON ⇒ 失败，且文案是 `describeDecodeFail` 那一句', async () => {
    const payload = unitPayload([inlineFile('/sj_ztglTags.ini', '{坏')])

    const result = await fontTagsEntry.write(payload)

    expect(result).toEqual({ status: 'error', reason: msg.data.fn.decodeNotJson() })
  })
})
