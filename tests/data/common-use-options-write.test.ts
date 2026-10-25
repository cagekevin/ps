import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildOptionPatch } from '@/domain/common-use'
import { readValue } from '../support/repo-read'

/**
 * T-88b2：面板参数写回 `sj_set.json` 的三条靶点。
 *
 * 1. 改一个键 → 只变那一个（别的键逐字节不变）
 * 2. 改 `cyExport.ext` → `compress` 兄弟键仍在（整块替换会静默抹掉，靶点⑤）
 * 3. 卸载重读 → 值还在（同一份文件重读）
 *
 * 数据层用内存文件替身，不碰真机 `%APPDATA%`。
 */

import { installFakeFs } from '../helpers/fake-fs'
import { ERR_PREFIX } from '@/utils/errors'

/** 假的是**操作系统**（不是 mock 写原语）—— 写原语在 `disk-write`，mock `@/cep/fs` 拦不住它 */
const fakeDisk = installFakeFs()

vi.mock('@/cep/transport', () => ({
  hasCep: () => true,
  evalScriptRaw: async () => `${ERR_PREFIX}文件不存在: `,
}))

// 只留**环境探测**（不是文件内容）：路径由用例指定
vi.mock('@/cep/paths', () => ({
  userDir: () => '/tmp/psz-test',
}))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

const { readCommonUseOptions, updateCommonUseOptions } = await import('@/cep/data/legacy-settings')

const SET_PATH = '/tmp/psz-test/sj_set.json'

function seed(content: Record<string, unknown>) {
  fakeDisk.files.set(SET_PATH, JSON.stringify(content))
}

function disk(): Record<string, unknown> {
  return JSON.parse(fakeDisk.files.get(SET_PATH) ?? '{}')
}

beforeEach(() => {
  fakeDisk.install()
  fakeDisk.files.clear()
})

describe('buildOptionPatch', () => {
  it('点路径变成嵌套补丁，三段也行', () => {
    expect(buildOptionPatch('cyDragInAutoEmbed', true)).toEqual({ cyDragInAutoEmbed: true })
    expect(buildOptionPatch('cyExport.ext', 'PNG')).toEqual({ cyExport: { ext: 'PNG' } })
    expect(buildOptionPatch('cyExport.compress.exportOriginalGraph', true)).toEqual({
      cyExport: { compress: { exportOriginalGraph: true } },
    })
  })

  it('空段路径直接抛（防 `cyExport..ext` 写成一层）', () => {
    expect(() => buildOptionPatch('cyExport..ext', 1)).toThrow()
    expect(() => buildOptionPatch('', 1)).toThrow()
  })
})

describe('写回只动一个键', () => {
  it('改 cyDragInAutoEmbed：其它键逐字节不变', async () => {
    seed({
      ztPasteFont: { color: true },
      cyDragInAutoEmbed: false,
      cyLinkObject: 'original',
      cyOptimizeAll: true,
    })

    await updateCommonUseOptions(buildOptionPatch('cyDragInAutoEmbed', true))

    const next = disk()
    expect(next.cyDragInAutoEmbed).toBe(true)
    expect(next.cyLinkObject).toBe('original')
    expect(next.cyOptimizeAll).toBe(true)
    expect(next.ztPasteFont).toEqual({ color: true })
  })

  it('改 cyExport.ext：compress 四个子键仍在（靶点⑤，整块替换会静默抹掉）', async () => {
    seed({
      cyExport: {
        ext: 'JPG',
        quality: '100',
        compress: { enable: true, level: 60, exportOriginalGraph: false, watermark: '' },
      },
    })

    await updateCommonUseOptions(buildOptionPatch('cyExport.ext', 'PNG'))

    const next = disk() as { cyExport: Record<string, unknown> }
    expect(next.cyExport.ext).toBe('PNG')
    expect(next.cyExport.compress).toEqual({
      enable: true,
      level: 60,
      exportOriginalGraph: false,
      watermark: '',
    })
  })

  it('未知键被拒（不污染别人的设置文件）', async () => {
    seed({ cyDragInAutoEmbed: false })

    await expect(updateCommonUseOptions({ ztUnknown: 1 } as never)).rejects.toThrow()
    expect(disk()).toEqual({ cyDragInAutoEmbed: false })
  })
})

describe('重读还在（等价于"卸载重挂"）', () => {
  it('写完再读：值来自文件，不是内存默认', async () => {
    seed({ cyDragInAutoEmbed: false, cyExport: { ext: 'JPG', compress: { level: 60 } } })

    await updateCommonUseOptions(buildOptionPatch('cyOpenDranInToLinkObject', true))
    const read = await readCommonUseOptions()

    expect(readValue(read).cyOpenDranInToLinkObject).toBe(true)
    expect((readValue(read).cyExport as { compress: { level: number } }).compress.level).toBe(60)
  })
})
