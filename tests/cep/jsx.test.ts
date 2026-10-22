import { afterEach, describe, expect, it } from 'vitest'
import { CepError } from '@/utils/errors'
import { createFontJsx } from '@/cep/jsx/font'
import { createLayerJsx } from '@/cep/jsx/layer'
import { createJsxPort } from '@/cep/jsx'
import { createMockJsx } from '@/cep/jsx/mock'

type Bridge = { evalScript: (script: string, cb: (res: string) => void) => void }
const holder = window as unknown as { __adobe_cep__?: Bridge }

let scripts: string[] = []

function setBridge(handler: (script: string) => string) {
  scripts = []
  holder.__adobe_cep__ = {
    evalScript(script, cb) {
      scripts.push(script)
      cb(handler(script))
    },
  }
}

afterEach(() => {
  delete holder.__adobe_cep__
  scripts = []
})

describe('真实实现：脚本串', () => {
  it('setFont 按原面板顺序传 hjm / mz / zz', async () => {
    setBridge(() => 'null')
    await createFontJsx().setFont('MiSans-Bold', 'MiSans', 'Bold')

    expect(scripts).toHaveLength(1)
    expect(scripts[0]).toContain('ztgl_setFont(')
    expect(scripts[0]).toContain("'MiSans-Bold'")
    expect(scripts[0]).toContain("'MiSans'")
    expect(scripts[0]).toContain("'Bold'")
  })

  it('initSystemList 无参数', async () => {
    setBridge(() => '[]')
    await createFontJsx().initSystemList()
    expect(scripts[0]).toContain('ztgl_initSystemList()')
  })

  it('图层查询分别调对应函数', async () => {
    setBridge(() => 'true')
    const layer = createLayerJsx()
    await layer.isSelectLayer()
    await layer.getTypeNumber()
    expect(scripts[0]).toContain('Layer_isSelectLayer()')
    expect(scripts[1]).toContain('Layer_getTypeNumber()')
  })
})

describe('真实实现：错误', () => {
  it('ERR: 前缀转成 CepError，并带 label', async () => {
    setBridge(() => 'ERR:没有选中图层')
    await expect(createFontJsx().setFont('a', 'b', 'c')).rejects.toBeInstanceOf(CepError)
  })

  it('返回值原样给调用方（err 判定留给 ps.ts）', async () => {
    setBridge(() => JSON.stringify({ err: 1, msg: '字体不存在' }))
    const res = (await createFontJsx().setFont('a', 'b', 'c')) as { err?: number }
    expect(res.err).toBe(1)
  })
})

describe('mock 实现', () => {
  it('initSystemList 返回非空数组（已归一化，normalizeFont 幂等）', async () => {
    const list = (await createMockJsx().font.initSystemList()) as Array<{ family: string }>
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
    expect(typeof list[0].family).toBe('string')
  })

  it('setFont / env / 图层查询都不抛', async () => {
    const port = createMockJsx()
    await expect(port.font.setFont('a', 'b', 'c')).resolves.toBeNull()
    await expect(port.env.setEnv('{}')).resolves.toBeUndefined()
    await expect(port.layer.isSelectLayer()).resolves.toBe(true)
    await expect(port.layer.getTypeNumber()).resolves.toBe(2)
  })
})

describe('createJsxPort', () => {
  it('inCep=false 时是 mock，不触发 evalScript', async () => {
    const port = createJsxPort(false)
    await port.layer.isSelectLayer()
    expect(scripts).toHaveLength(0)
  })

  it('inCep=true 时走真实实现', async () => {
    setBridge(() => 'false')
    const port = createJsxPort(true)
    await port.layer.isSelectLayer()
    expect(scripts[0]).toContain('Layer_isSelectLayer')
  })
})
