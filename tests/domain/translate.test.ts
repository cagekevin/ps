import { describe, expect, it } from 'vitest'
import {
  buildTranslateParams,
  decodeText,
  encodeText,
  parseTranslateResponse,
  TRANSLATE_APP_ID,
  TRANSLATE_KEY,
} from '@/domain/translate'
import { md5 } from '@/utils/md5'

describe('翻译编解码（原版 Xv / qv）', () => {
  it('中文与 ASCII 往返一致', () => {
    for (const text of ['设计助理', 'hello', '一行\n两行', '']) {
      expect(decodeText(encodeText(text))).toBe(text)
    }
  })
})

describe('翻译签名', () => {
  it('sign = md5(appid + q + salt + key)，salt 可控', () => {
    const params = buildTranslateParams({ text: '设计', from: 'zh', to: 'en', salt: 123 })
    expect(params.sign).toBe(md5(TRANSLATE_APP_ID + '设计' + '123' + TRANSLATE_KEY))
    expect(params.salt).toBe('123')
    expect(params._time).toBe('123')
    expect(params.from).toBe('zh')
  })
})

describe('翻译响应解析', () => {
  it('成功取 trans_result[0].dst', () => {
    expect(
      parseTranslateResponse({ error_code: '52000', trans_result: [{ dst: 'hello' }] }),
    ).toEqual({ status: 'ok', text: 'hello' })
  })

  /**
   * 收口后失败是**可枚举的码** + 外部原话（`reason`），不再是一句 `message`：
   * 「翻译失败」这句生产者的话由 `msg.command.fn.fontSetTranslateFailed` 渲染（判据 3）。
   */
  it('错误码 → badCode + 百度原话', () => {
    expect(parseTranslateResponse({ error_code: '54003', error_msg: '频率超限' })).toEqual({
      status: 'error',
      fail: 'badCode',
      reason: '频率超限',
    })
  })

  it('空结果 / 没有 dst → noResult；不是对象 → badResponse', () => {
    expect(parseTranslateResponse({ trans_result: [] })).toEqual({
      status: 'error',
      fail: 'noResult',
    })
    expect(parseTranslateResponse(null)).toEqual({ status: 'error', fail: 'badResponse' })
  })
})
