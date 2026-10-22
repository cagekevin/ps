import { beforeEach, describe, expect, it, vi } from 'vitest'
import { legacySettingsRepo } from '@/cep/data/legacy-settings'
import { starsRepo, tagsRepo } from '@/cep/data'
import { fontSettingsEntry } from '@/cep/cloud/entries/font-settings'
import { fontStarsEntry } from '@/cep/cloud/entries/font-stars'
import { fontTagsEntry } from '@/cep/cloud/entries/font-tags'

const fsMock = vi.hoisted(() => ({
  readTextSmart: vi.fn(),
}))

vi.mock('@/cep/fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/cep/fs')>()
  return {
    ...actual,
    userDir: () => '/user',
    readTextSmart: fsMock.readTextSmart,
  }
})

beforeEach(async () => {
  vi.clearAllMocks()
  await legacySettingsRepo.write({})
  await starsRepo.write([])
  await tagsRepo.write([])
  fsMock.readTextSmart.mockResolvedValue('{}')
})

describe('cloud entries', () => {
  it('font.settings 只 patch 已知字段，未知键保留', async () => {
    const raw = {
      keepMe: 7,
      ztPasteFont: { scriptFamily: true, color: true },
    }
    await legacySettingsRepo.write(raw)
    fsMock.readTextSmart.mockResolvedValue(JSON.stringify(raw))

    const read = await fontSettingsEntry.read()
    const data = JSON.parse(
      (read.files[0].content as { kind: 'inline'; data: string }).data,
    ) as Record<string, unknown>
    data.ztExpandMultiple = false

    const result = await fontSettingsEntry.write({
      ...read,
      files: [
        {
          ...read.files[0],
          content: {
            kind: 'inline',
            data: JSON.stringify(data),
            encoding: 'json',
          },
        },
      ],
    })

    expect(result.ok).toBe(true)
    const saved = (await legacySettingsRepo.read()).value
    expect(saved.keepMe).toBe(7)
    expect((saved as Record<string, unknown>).ztExpandMultiple).toBe(false)
  })

  it('font.settings 缺文件时读取失败', async () => {
    fsMock.readTextSmart.mockResolvedValue(null)
    await expect(fontSettingsEntry.read()).rejects.toThrow('不存在')
  })

  it('font.stars / font.tags 读写数组', async () => {
    const stars = await fontStarsEntry.read()
    const tags = await fontTagsEntry.read()

    expect(stars.files[0].path).toBe('/sj_ztglStar.ini')
    expect(tags.files[0].path).toBe('/sj_ztglTags.ini')

    const starWrite = await fontStarsEntry.write({
      ...stars,
      files: [
        {
          ...stars.files[0],
          content: { kind: 'inline', data: '[{"name":"MiSans","star":3}]', encoding: 'json' },
        },
      ],
    })
    expect(starWrite.ok).toBe(true)
    expect((await starsRepo.read()).value).toEqual([{ name: 'MiSans', star: 3 }])
  })
})
