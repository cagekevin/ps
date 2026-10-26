import { afterEach, describe, expect, it } from 'vitest'
import { jsx } from '@/cep/jsx'
import { log } from '@/utils/logger'
import { installHostBridge, removeHostBridge } from '../helpers/host-stub'

/**
 * jsx 端口的环境判据必须在**调用点**，不能是模块求值期快照。
 *
 * 判据只有一份（`hasCep`，与 `transport.runScript` 同一个函数），才不会出现
 * 「transport 说得清、jsx 端口已经落定到 mock」两套真相。反例很贵：mock 每个函数
 * 都返回成功 → 面板弹「完成」、数据全是假的。
 *
 * 这条用例就是拿"同一份模块实例、跨环境调用"来钉住它：先非 CEP（mock：true），
 * 再补上桥（真实：false）。快照式实现第二次仍返回 true，直接红。
 */

afterEach(() => {
  removeHostBridge()
})

describe('jsx 端口按调用期判环境', () => {
  it('同一实例：先 mock，补上 CEP 桥后下一次调用走真实实现', async () => {
    // 模块已在本文件顶部求值完毕——此刻没有桥
    await expect(jsx.layer.isSelectLayer()).resolves.toEqual({ status: 'ok', data: true }) // mock 恒真
    expect(log.dump()).toContain('走 mock')

    const scripts: string[] = []
    installHostBridge({
      evalScript(script, cb) {
        scripts.push(script)
        cb('false')
      },
    })

    // 真实实现：Layer_isSelectLayer 回 'false' → false（与 mock 的 true 可区分）
    await expect(jsx.layer.isSelectLayer()).resolves.toEqual({ status: 'ok', data: false })
    expect(scripts).toHaveLength(1)
    expect(scripts[0]).toContain('Layer_isSelectLayer')
  })

  it('环境回退也按调用点算：桥被拿掉后下一次调用回到 mock 并留痕', async () => {
    installHostBridge({
      evalScript(_script, cb) {
        cb('false')
      },
    })
    await expect(jsx.layer.isSelectLayer()).resolves.toEqual({ status: 'ok', data: false })

    removeHostBridge()
    await expect(jsx.layer.isSelectLayer()).resolves.toEqual({ status: 'ok', data: true })
    expect(log.dump()).toContain('当前不在 CEP 环境')
  })
})
