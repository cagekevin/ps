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
    ).toEqual({ ok: true, text: 'hello' })
  })

  it('错误码与空结果都算失败', () => {
    expect(parseTranslateResponse({ error_code: '54003', error_msg: '频率超限' })).toEqual({
      ok: false,
      message: '频率超限',
    })
    expect(parseTranslateResponse({ trans_result: [] })).toEqual({
      ok: false,
      message: '翻译失败',
    })
    expect(parseTranslateResponse(null)).toEqual({ ok: false, message: '翻译失败' })
  })
})
