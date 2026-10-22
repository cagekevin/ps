import { describe, expect, it } from 'vitest'
import { CepError } from '@/utils/errors'
import { describeCepError } from '@/utils/error-text'

describe('describeCepError', () => {
  it('NO_CEP 提示不在面板里', () => {
    expect(describeCepError(new CepError('NO_CEP', 'x'))).toBe('当前不在 Photoshop 面板中运行')
  })

  it('NO_NODE 指向 manifest 配置', () => {
    expect(describeCepError(new CepError('NO_NODE', 'x'))).toContain('--enable-nodejs')
  })

  it('TIMEOUT 说明是 PS 没响应', () => {
    expect(describeCepError(new CepError('TIMEOUT', 'x'))).toContain('没有响应')
  })

  it('INIT 带出原始 message', () => {
    expect(describeCepError(new CepError('INIT', 'jsxbin 未加载'))).toBe(
      'Photoshop 脚本初始化失败：jsxbin 未加载',
    )
  })

  it('NO_SELECTION 直接用 message', () => {
    expect(describeCepError(new CepError('NO_SELECTION', '请先选择图层'))).toBe('请先选择图层')
  })

  it('未知错误码回退到 message', () => {
    expect(describeCepError(new CepError('OTHER' as never, '原始错误'))).toBe('原始错误')
  })

  it('普通 Error 取 message', () => {
    expect(describeCepError(new Error('boom'))).toBe('boom')
  })

  it('字符串和非 Error 值转成字符串', () => {
    expect(describeCepError('直接是字符串')).toBe('直接是字符串')
    expect(describeCepError(42)).toBe('42')
  })
})
