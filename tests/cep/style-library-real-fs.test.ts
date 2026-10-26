import fs from 'node:fs'
import { SEED } from '../helpers/cas-seed'
import {
  installHostBridge,
  installHostRequire,
  removeHostBridge,
  removeHostRequire,
} from '../helpers/host-stub'
import { hasNode } from '@/cep/node'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'

/**
 * 真机路径（`fileRepo`）下的样式库写盘与串行化 —— 凭证 +反向对照。
 *
 * 为什么必须单开一个文件：其余 `style-library-*.test.ts` 把 `@/cep/fs` 整层 mock，**且** jsdom 下
 * `hasCep()` 为 `false` → `dataRepo()` 选 `memoryRepo`（它是实例本地 `enqueue`，不是全局 `runQueued`）。
 * 那等于连被测实现都换掉了：39 条用例全绿，却从没跑过 `fileRepo` —— 这正是「按构造绿 / 检测母体缺位」
 * 。这里装真 `window.require`（node:fs）+ 真 `window.__adobe_cep__` → `hasCep()`=true
 * → 走 `fileRepo`，测的是真代码 + 真磁盘 + 真全局写链；死锁会以「超时」直接暴露（不再假绿）。
 */
const realRequire = createRequire(import.meta.url)

let dir = ''

/**
 * 非空 ⇒ 路径包含该片段的 `readFileSync` 抛 EACCES（造「存在但读不到」）。
 * 真磁盘上 chmod 造权限错在 root 下失效，所以按路径注入。
 */
let failReadMatching = ''

function installRealEnv(): void {
  installHostRequire((id: string) => {
    if (id !== 'fs') return realRequire(id)
    const real = realRequire(id) as typeof fs
    return {
      ...real,
      readFileSync: (p: string, ...rest: unknown[]) => {
        if (failReadMatching && String(p).includes(failReadMatching)) {
          throw Object.assign(new Error(`EACCES: ${p}`), { code: 'EACCES' })
        }
        return (real.readFileSync as (...a: unknown[]) => unknown)(p, ...rest)
      },
    }
  })
  // 真机上 `readTextOutcome` 在 node 报 notSeen 时会再问一次 jsx `File`（fs.ts:493）；
  // 这里让假桥对"文件不存在"回 notSeen（`ERR:` + `文件不存在: `），否则该分支永不回包 → 挂。
  installHostBridge({
    // 真桥一定有 `getSystemPath`；`userDir()` 现在"桥在就只认宿主"（拿不到就抛，不静默回落）。
    // 指到本用例的 `dir`（闭包，beforeEach 才赋值）—— 与 `process.env.APPDATA = dir`
    // 那条平台公式等价，所以各用例期望的路径不变。
    getSystemPath: () => `file://${dir}`,
    evalScript: (_script, cb) => cb?.(`ERR:文件不存在: fake`),
  })
}

// 顶层 import：`fs.ts` 的 `nodeRequire` 是运行时惰性调用（见 `fs.ts:getRequire`），
// 只要在真正用到之前把 `window.require` 装上即可，模块加载顺序不影响。
const { userDir } = await import('@/cep/paths')
const {
  addKuGroup,
  readKuGroupId,
  readKuItem,
  selectWarehouse,
  deleteWarehouse,
  styleIndexWriter,
} = await import('@/cep/data/style-library-repo')
const { importKuArchive } = await import('@/cep/data/style-library-io')

const indexPath = (): string => `${userDir()}/sj_kuStoreInfo.ini`
const libPath = (name: string): string => `${userDir()}/${name}`

/** 一个仓库的索引：当前仓库 `默认仓库` 的四个库文件名 */
function oneWarehouse(colorFile: string) {
  return {
    index: 0,
    list: [
      {
        name: '默认仓库',
        color: colorFile,
        gradient: 'sj_kuGraA.json',
        font: 'sj_kuFonA.json',
        style: 'sj_kuStyA.json',
      },
    ],
  }
}

function readJson<T = unknown>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}

beforeEach(() => {
  failReadMatching = ''
  installRealEnv()
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psz-sl-realfs-'))
  process.env.APPDATA = dir
  fs.mkdirSync(userDir(), { recursive: true })
})

afterEach(() => {
  removeHostRequire()
  removeHostBridge()
  // 桩不许留在环境里：卸完必须"没有 node"（留着 → 下一个用例带着上一个的桩跑 → 假绿）
  expect(hasNode()).toBe(false)
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

/**
 * （母体）：`hasCep`=true → `fileRepo`。改前 `addKuGroup`/`selectWarehouse`/`deleteWarehouse`
 * 在 `runQueued` 里再调排队的 `styleIndexWriter.*` → 自锁，本组用例会**超时**（不是断言失败）。
 * 改成锁内 `*InLock` 后必须跑完并真落盘。超时 = 红。
 */
describe('TD-09-30：fileRepo 下编辑/切换/删除仓库不再自锁', () => {
  it('addKuGroup 真落盘（读-改-写一次原子写 + 一份 .bak）', async () => {
    await styleIndexWriter.replace(oneWarehouse('sj_kuColA.json'), SEED)
    fs.writeFileSync(
      libPath('sj_kuColA.json'),
      JSON.stringify([{ name: 'g', show: true, list: [] }]),
    )

    await addKuGroup('color', '新组')

    const groups = readJson<Array<{ name: string }>>(libPath('sj_kuColA.json'))
    expect(groups.map((g) => g.name)).toEqual(['g', '新组'])
    // 上一版进了 .bak（备份与原子写都还在，没被这次重构摘掉）
    expect(fs.existsSync(`${libPath('sj_kuColA.json')}.bak`)).toBe(true)
  }, 5000)

  it('selectWarehouse 写索引不挂', async () => {
    await styleIndexWriter.replace(
      {
        index: 0,
        list: [
          { name: 'A', color: 'sj_kuColA.json' },
          { name: 'B', color: 'sj_kuColB.json' },
        ],
      },
      SEED,
    )

    await selectWarehouse(1)

    expect(readJson<{ index: number }>(indexPath()).index).toBe(1)
  }, 5000)

  it('deleteWarehouse 把旧文件移进 .deleted-*/ 并改索引，不挂', async () => {
    fs.writeFileSync(libPath('sj_kuColA.json'), '[]')
    fs.writeFileSync(libPath('sj_kuColB.json'), '[]')
    await styleIndexWriter.replace(
      {
        index: 1,
        list: [
          { name: 'A', color: 'sj_kuColA.json' },
          { name: 'B', color: 'sj_kuColB.json' },
        ],
      },
      SEED,
    )

    const result = await deleteWarehouse(0)

    const index = readJson<{ index: number; list: Array<{ name: string }> }>(indexPath())
    expect(index.list.map((w) => w.name)).toEqual(['B'])
    // 回收目录里真有旧文件（真 node:fs 复制 + 删原件这段也跑到了）
    expect(fs.existsSync(`${result.recycleDir}/sj_kuColA.json`)).toBe(true)
    expect(fs.existsSync(libPath('sj_kuColA.json'))).toBe(false)
  }, 5000)
})

/**
 * `.kux` 导入**真的写盘**。整层 mock fs 的旧用例删掉原子写也不会红；这里走真 `node:fs`
 * 断言磁盘上确实多了一份 `sj_kuCol*.json` 且内容正确、且没有残留 `.tmp`。
 */
describe('TD-09-29：.kux 导入对真磁盘写盘（fileRepo + node:fs）', () => {
  it('导入后用户目录里出现真实库文件（内容正确、无 .tmp 残留）', async () => {
    const kuxPath = `${dir}/D.kux`
    fs.writeFileSync(
      kuxPath,
      JSON.stringify({
        arrFileData: [{ name: 'sj_kuColAAAA.json', data: Buffer.from('[]').toString('base64') }],
        store: { index: 0, list: [{ name: '导入仓库', color: 'sj_kuColAAAA.json' }] },
      }),
    )

    const result = await importKuArchive(false, kuxPath)

    expect(result.files).toBe(1)
    // 真磁盘：有一个 sj_kuCol*.json，内容为 '[]'
    const cols = fs.readdirSync(userDir()).filter((f) => /^sj_kuCol[0-9A-F]+\.json$/.test(f))
    expect(cols).toHaveLength(1)
    expect(fs.readFileSync(libPath(cols[0]), 'utf8')).toBe('[]')
    // 索引也真落盘，且指向那个文件
    expect(fs.existsSync(indexPath())).toBe(true)
    expect(JSON.stringify(readJson(indexPath()))).toContain(cols[0])
    // 原子写不留 tmp
    expect(fs.readdirSync(userDir()).some((f) => f.endsWith('.tmp'))).toBe(false)
  }, 5000)
})

/**
 * **T-109 的真机版**：`writeKuFile` 的「读不到 ⇒ 中止」在真磁盘上也要成立。
 *
 * 造「存在但读不到」= 让 `sj_kuCol*` 的 `readFileSync` 抛 EACCES（真 chmod 在 root 下失效）。
 * 这是**回归护栏**，不是「改前红」证据：旧实现同样在这里抛。
 * 它钉住的是三件事：① 错误码是 `IO`（不是被 CAS 包装成别的东西）② 一个库文件都没落
 * ③ 没有凭空写 `.bak`。
 */
describe('T-109：导入时原文读不到 ⇒ 中止，不落文件、不留 .bak', () => {
  it('库文件读抛 EACCES → 导入抛 IO，且用户目录里没有新库文件、没有 .bak', async () => {
    const name = 'sj_kuColAAAA.json'
    const kuxPath = `${dir}/E.kux`
    fs.writeFileSync(
      kuxPath,
      JSON.stringify({
        arrFileData: [{ name, data: Buffer.from('[]').toString('base64') }],
        store: { index: 0, list: [{ name: '导入仓库', color: name }] },
      }),
    )

    // 只对库文件注入：索引与源包照常可读，否则测的就不是这一条判据了
    failReadMatching = 'sj_kuCol'

    await expect(importKuArchive(false, kuxPath)).rejects.toMatchObject({ code: 'IO' })

    failReadMatching = ''
    const cols = fs.readdirSync(userDir()).filter((f) => /^sj_kuCol[0-9A-F]+\.json$/.test(f))
    expect(cols).toHaveLength(0)
    expect(fs.readdirSync(userDir()).some((f) => f.endsWith('.bak'))).toBe(false)
  }, 5000)
})

/**
 * 导入与日常编辑**排在同一条链**上。顺序执行时两者都要成功、互不吞掉对方的写
 * 且导入走 `runQueued` 后与 `addKuGroup` 共用一条链（fan-in 见报告里的 grep），不会再各写各的。
 */
describe('TD-09-28：导入与编辑共用一条写链（顺序执行都不丢）', () => {
  it('编辑 → 导入 → 再编辑：三次都真落盘', async () => {
    await styleIndexWriter.replace(oneWarehouse('sj_kuColA.json'), SEED)
    fs.writeFileSync(
      libPath('sj_kuColA.json'),
      JSON.stringify([{ name: 'g', show: true, list: [] }]),
    )

    // 1) 编辑
    await addKuGroup('color', '编辑一')

    // 2) 覆盖导入（整份替换索引 + 写新库文件 + 旧文件进回收）
    const kuxPath = `${dir}/E.kux`
    fs.writeFileSync(
      kuxPath,
      JSON.stringify({
        arrFileData: [{ name: 'sj_kuColEEEE.json', data: Buffer.from('[]').toString('base64') }],
        store: { index: 0, list: [{ name: '导入仓库', color: 'sj_kuColEEEE.json' }] },
      }),
    )
    await importKuArchive(false, kuxPath)

    // 导入后索引指向新库文件，旧仓库文件被移进回收
    const idx = readJson<{ list: Array<{ name: string; color: string }> }>(indexPath())
    expect(idx.list[0].name).toBe('导入仓库')

    // 3) 在新仓库上再编辑
    await addKuGroup('color', '编辑二')
    const cols = fs.readdirSync(userDir()).filter((f) => /^sj_kuCol[0-9A-F]+\.json$/.test(f))
    expect(cols).toHaveLength(1)
    const groups = readJson<Array<{ name: string }>>(libPath(cols[0]))
    expect(groups.map((g) => g.name)).toEqual(['编辑二'])
  }, 5000)
})

/**
 * ③层（纯解析）不撒谎：`readRawGroups` 曾把 `JSON.parse` 的结果直接 `as KuRawGroup[]`。
 * 顶层是数组、元素却不是对象（`[42]`）时，那条 `as` 让下游 `filter(isRecord)` 静默丢弃，
 * 表现成「这个库本来就空」——用户看不到任何原因。现在必须是**显式 PARSE**。
 */
describe('③层：库文件元素不是对象 ⇒ 显式 PARSE，不当空库', () => {
  it('[42] → 抛 PARSE，不是返回空组数组', async () => {
    await styleIndexWriter.replace(oneWarehouse('sj_kuColA.json'), SEED)
    fs.writeFileSync(libPath('sj_kuColA.json'), '[42]')

    // 两条都要断：只有码不够 —— 去掉那道证明后这里仍会抛 PARSE（退化成"组 id 缺失"），
    // 用户还是看不懂为什么。措辞必须指向"元素不是对象"。
    expect(() => readKuGroupId('color', 0)).toThrow(expect.objectContaining({ code: 'PARSE' }))
    expect(() => readKuGroupId('color', 0)).toThrow(/不是对象/)
  })

  it('对照：元素是对象时照常读到（新判据没有把正常库挡掉）', async () => {
    await styleIndexWriter.replace(oneWarehouse('sj_kuColA.json'), SEED)
    fs.writeFileSync(
      libPath('sj_kuColA.json'),
      JSON.stringify([{ name: 'g', show: true, list: [{ name: 'i' }] }]),
    )

    expect(readKuItem('color', 0, 0)).toEqual({ name: 'i' })
  })
})
