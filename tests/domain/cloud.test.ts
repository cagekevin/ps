import { describe, expect, it } from 'vitest'
import {
  buildSnapshot,
  decideUpload,
  diffUnits,
  normalizeCloudPayload,
  stableStringify,
  unitHash,
  unitsHash,
  type SyncUnit,
} from '@/domain/cloud'

function unit(overrides: Partial<SyncUnit> = {}): SyncUnit {
  return {
    schema: 1,
    hash: 'hash-a',
    files: [],
    ...overrides,
  }
}

describe('cloud snapshot', () => {
  it('stableStringify 与对象 key 顺序无关，数组顺序保留', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]))
  })

  it('unitHash 对 files 顺序敏感', () => {
    const file = (path: string) => ({
      path,
      size: 1,
      content: { kind: 'inline' as const, data: '{}', encoding: 'json' as const },
    })
    expect(unitHash({ schema: 1, files: [file('a'), file('b')] })).not.toBe(
      unitHash({ schema: 1, files: [file('b'), file('a')] }),
    )
  })

  it('normalize 支持 { data: snapshot }', () => {
    const view = normalizeCloudPayload({
      data: {
        type: 'psz_sync',
        schema: 1,
        rev: 3,
        updatedAt: 100,
        units: { 'font.tags': unit() },
      },
    })

    expect(view?.rev).toBe(3)
    expect(view?.units['font.tags'].hash).toBe('hash-a')
  })

  it('normalize 支持裸包 + __meta', () => {
    const view = normalizeCloudPayload({
      type: 'psz_sync',
      schema: 1,
      units: { 'font.stars': unit() },
      __meta: { rev: 4, updatedAt: 200, schema: 1 },
    })

    expect(view?.rev).toBe(4)
    expect(view?.updatedAt).toBe(200)
  })

  it('无 units 返回 null', () => {
    expect(normalizeCloudPayload({ data: {} })).toBeNull()
    expect(normalizeCloudPayload(null)).toBeNull()
  })

  it('buildSnapshot 写入 __meta，且 unitsHash 不含 rev', () => {
    const units = { 'font.tags': unit() }
    const a = buildSnapshot(units, 1, 100)
    const b = buildSnapshot(units, 2, 200)

    expect(a.__meta?.rev).toBe(1)
    expect(unitsHash(a.units)).toBe(unitsHash(b.units))
  })
})

describe('decideUpload', () => {
  const base = {
    cloudReadable: true,
    cloudExists: true,
    cloudRev: 3,
    cloudUpdatedAt: 300,
    ledger: { rev: 3, syncedAt: 300, localHash: 'same' },
    localHash: 'same',
    cloudHash: 'same',
  }

  it('内容一致 → inSync', () => {
    expect(decideUpload(base).inSync).toBe(true)
  })

  it('云端空 → none', () => {
    expect(decideUpload({ ...base, cloudExists: false }).kind).toBe('none')
  })

  it('无台账 + 云端有数据 → cloud-newer', () => {
    expect(decideUpload({ ...base, ledger: null, cloudHash: 'other' }).kind).toBe('cloud-newer')
  })

  it('云端更新 + 本地改动 → both-changed', () => {
    expect(
      decideUpload({ ...base, cloudRev: 4, localHash: 'local', cloudHash: 'cloud' }).kind,
    ).toBe('both-changed')
  })

  it('云端读不到 → cloud-unknown', () => {
    expect(decideUpload({ ...base, cloudReadable: false }).kind).toBe('cloud-unknown')
  })
})

describe('diffUnits', () => {
  it('区分 conflicts / cloudOnly / localOnly', () => {
    const diff = diffUnits(
      { same: unit({ hash: 'same' }), both: unit({ hash: 'c' }) },
      { same: unit({ hash: 'same' }), both: unit({ hash: 'l' }), local: unit({ hash: 'l2' }) },
    )
    expect(diff).toEqual({
      conflicts: ['both'],
      cloudOnly: [],
      localOnly: ['local'],
    })
  })
})
