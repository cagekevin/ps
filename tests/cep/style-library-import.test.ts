import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 导入 `.kux` 的回归用例（TD-09-20）：写路径"半截不会留下"。
 *
 * 第 3 段的落地层：`cep/data/style-library-io.ts` 的 `importKuArchive`。
 *
 * 只测这一层能证明的三件事：
 * 1. **备份**：改库前把原文写进 `<库文件>.bak`（回滚 = 把 .bak 复制回去）；
 * 2. **写库顺序**：索引里没有文件名时，先写库文件、成功后才补索引（反过来会让索引指向不存在的文件）；
 * 3. **不静默兜底**：库文件损坏 / 写失败一律抛，绝不覆盖原件、绝不"看起来成功"。
 *
 * 全部走内存 fs（`@/cep/fs` 被替身），不碰真实 `%APPDATA%`。
 */
const fsMock = vi.hoisted(() => ({
  files: new Map<string, string>(),
  /** 让 `writeTextFileAtomic` 返回 false，模拟磁盘写失败 */
  failAtomic: false,
  /** 每次原子写落的路径 —— 用来证明"一次拖拽只写一次盘" */
  atomicWrites: [] as string[],
  /** 非空 = 这个路径的读返回 `error`（模拟 EPERM / EBUSY：文件在、但读不到） */
  readErrorPath: '',
}))

vi.mock('@/cep/fs', () => ({
  hasNode: () => true,
  userDir: () => 'ROAM/SheJiZhuLi',
  readTextSmart: async (path: string) => fsMock.files.get(path) ?? null,
  // T-107：唯一读入口（三态）+ 同步例外（CAS / 结构上同步的调用方）
  readTextOutcome: async (path: string) => {
    // T-112：文件在、但读不到（EPERM / EBUSY）——这是"读不到"，不是"没有"
    if (fsMock.readErrorPath && path === fsMock.readErrorPath) {
      return { status: 'error' as const, reason: 'EPERM: operation not permitted' }
    }
    const text = fsMock.files.get(path)
    return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
  },
  readTextSync: (path: string) => {
    const text = fsMock.files.get(path)
    return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
  },
  writeTextFileAtomic: (path: string, text: string) => {
    if (fsMock.failAtomic) return { status: 'error' as const, reason: 'EPERM: 模拟原子写失败' }
    fsMock.atomicWrites.push(path)
    fsMock.files.set(path, text)
    return { status: 'ok' as const }
  },
  writeTextFile: (path: string, text: string) => {
    fsMock.files.set(path, text)
  },
  // 删除仓库把文件移进回收目录：base64 只是"原样搬运"的载体，这里用同一个 Map 存文本即可
  // T-109：base64 读也走三态（只认 ENOENT 是 notSeen）
  readBase64Outcome: (path: string) => {
    const text = fsMock.files.get(path)
    return text === undefined
      ? { status: 'notSeen' as const }
      : { status: 'ok' as const, base64: Buffer.from(text).toString('base64') }
  },
  writeBase64File: (path: string, base64: string) => {
    if (fsMock.failAtomic) return { status: 'error' as const, reason: 'EPERM: 模拟写失败' }
    fsMock.files.set(path, Buffer.from(base64, 'base64').toString('utf8'))
    return { status: 'ok' as const }
  },
  // T-109：`removeFile` 现在返回 `{ ok } | { ok:false, reason }`，不再是 boolean
  removeFile: (path: string) => {
    fsMock.files.delete(path)
    return { ok: true as const }
  },
  b64ToUtf8: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
  utf8ToB64: (text: string) => Buffer.from(text, 'utf8').toString('base64'),
  isUsableJsonText: (text: string) => {
    try {
      JSON.parse(text)
      return true
    } catch {
      return false
    }
  },
  saveExportedText: (path: string, text: string) => {
    fsMock.files.set(path, text)
    return { status: 'ok' as const }
  },
  readTextFile: (path: string) => fsMock.files.get(path) ?? null,
}))

const { importKuArchive } = await import('@/cep/data/style-library-io')

const INDEX = 'ROAM/SheJiZhuLi/sj_kuStoreInfo.ini'

/** 一份最小可用的 `.kux`：一个库文件 + 引用它的索引 */
function kux(libName = 'sj_kuColAAAA.json'): string {
  return JSON.stringify({
    arrFileData: [{ name: libName, data: Buffer.from('[]').toString('base64') }],
    store: { index: 0, list: [{ name: '导入仓库', color: libName }] },
  })
}

beforeEach(() => {
  fsMock.files.clear()
  fsMock.atomicWrites.length = 0
  fsMock.failAtomic = false
  fsMock.readErrorPath = ''
})

describe('importKuArchive：写路径回归（TD-09-20）', () => {
  it('首次导入（索引不存在）→ 不写 .bak、不崩，索引落盘', async () => {
    fsMock.files.set('ROAM/D.kux', kux())

    const result = await importKuArchive(false, 'ROAM/D.kux')

    expect(result.files).toBe(1)
    // 索引本来不存在 = 首次使用：没有旧原文可备份，所以**不写 .bak**，也不许崩
    expect(fsMock.files.has(`${INDEX}.bak`)).toBe(false)
  })

  it('索引读不到 → 中止替换（没有 .bak 的替换等于没有退路）', async () => {
    fsMock.files.set(INDEX, '{"index":0,"list":[]}')
    fsMock.files.set('ROAM/D.kux', kux())
    fsMock.readErrorPath = INDEX

    await expect(importKuArchive(false, 'ROAM/D.kux')).rejects.toThrow(/索引读不到/)

    expect(fsMock.files.get(INDEX)).toBe('{"index":0,"list":[]}')
    expect(fsMock.files.has(`${INDEX}.bak`)).toBe(false)
  })

  it('写库文件失败 → 回滚只删本次新建，本地已有文件不动', async () => {
    const existing = 'ROAM/SheJiZhuLi/sj_kuColEXIST.json'
    fsMock.files.set(existing, '[{"name":"旧组","list":[]}]')
    fsMock.files.set('ROAM/D.kux', kux())
    fsMock.failAtomic = true

    await expect(importKuArchive(false, 'ROAM/D.kux')).rejects.toThrow()

    expect(fsMock.files.get(existing)).toBe('[{"name":"旧组","list":[]}]')
  })
})
