/**
 * 错误的**两条通道必须分叉**：
 *
 * | 通道 | 给谁 | 内容 |
 * |---|---|---|
 * | `CepError.message` → `describeCepError()` | 用户（toast / 错误条） | 中文一句话，**不含技术名词** |
 * | `CepError.cause` → `log.dump()`（`logger.oneLine`） | 开发者（日志 / DevTools） | 系统原文，**一个字都不翻译** |
 *
 * 判据是"同一条错误，两边读到的必须不同"：
 * 日志里有 `EPERM`，用户文案里没有；用户文案里有中文，日志里的技术原因不被它顶掉。
 *
 * 为什么值得单独钉：日志只剩"读不到"这种人话时，等于"有痕迹、查不出原因"——
 * 用户报障后仍然要靠猜是 `ENOENT` 还是 `EPERM`。
 */
import { describe, expect, it } from 'vitest'
import { CepError } from '@/utils/errors'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'

/** 每条用例用自己的唯一串，避免 `dump()` 里累积的历史互相干扰 */
function withCause() {
  return new CepError(
    'IO',
    '样式库读不到',
    undefined,
    new Error('EPERM: operation not permitted, unlink /u/ku.sj'),
  )
}

describe('CepError 的两条通道', () => {
  it('cause 进日志：dump() 里有系统原文与错误码', () => {
    log.error('style', '读取样式库失败（probe-a）', withCause())

    const dumped = log.dump()

    expect(dumped).toContain('读取样式库失败（probe-a）')
    expect(dumped).toContain('[IO]')
    expect(dumped).toContain('EPERM: operation not permitted')
  })

  it('message 进 UI：用户文案是中文，且不含技术原文', () => {
    const text = describeCepError(withCause())

    expect(text).toContain('样式库读不到')
    expect(text).not.toContain('EPERM')
  })

  it('没有 cause 时日志退回 message（不因为缺 cause 就丢掉原因）', () => {
    log.error('boot', '启动自检失败（probe-b）', new CepError('INIT', '扩展目录拿不到'))

    expect(log.dump()).toContain('[INIT] 扩展目录拿不到')
  })

  it('带 code 的普通 Error（node 系统错误）也走同一渲染：code 加原文', () => {
    const enoent = Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
    log.error('fs', '读文件失败（probe-c）', enoent)

    const dumped = log.dump()

    expect(dumped).toContain('[ENOENT]')
    expect(dumped).toContain('no such file or directory')
  })

  it('没有 code 也没有 cause 的 Error：退回 `name: message`', () => {
    log.error('x', '谁也没给码（probe-d）', new TypeError('boom'))

    expect(log.dump()).toContain('TypeError: boom')
  })
})
