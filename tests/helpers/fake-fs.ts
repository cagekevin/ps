// 是什么：测试用的**唯一**假文件系统 —— 装到 `window.require('fs')` 上，让真代码（`disk-write` / `fs`）跑在内存盘上
// 替代了什么：31 个测试各自 `vi.mock('@/cep/fs-read', () => ({
//   createRequire,
// }))` 假**写原语** + 14 个测试各自手写的 `installRequire`
// 谁在用：所有需要落盘 / 注入读写失败的测试
// 禁止：再 `vi.mock('@/cep/fs-read', () => ({
//   createRequire,
// }))` 去假**写原语** —— 写原语在 `src/cep/disk-write.ts`，
//   mock `@/cep/fs` 拦不住它，而且会逼生产代码把原语留在 fs.ts（架构被测试绑架）。
//   正确姿势：`installFakeFs()` 假**操作系统**，生产代码一行不改。
//
// 为什么内存盘而不是临时目录：这些用例要**注入** EACCES / ENOSPC / rename 失败，
// 真磁盘上模拟权限错要 chmod（跨平台不稳、root 下还失效）。内存盘能精确注入。
// `rename` 语义按真实现模拟（键移动），所以"不留 tmp"这类断言仍然有效。

import { createRequire } from 'node:module'

const realRequire = createRequire(import.meta.url)

export interface WriteRecord {
  path: string
  text: string
}

export interface FakeDisk {
  /** 内存盘：路径 → 文本或字节（`writeBase64File` 写的是 `Buffer`） */
  readonly files: Map<string, string | Buffer>
  /** 所有 `writeFileSync` 的调用记录（含 tmp 写入 —— 用它断言"不留 tmp"） */
  readonly writes: WriteRecord[]
  /** true 或错误串 ⇒ 下一次 `writeFileSync` 抛 */
  failWrite: boolean | string
  /** true ⇒ 下一次 `renameSync` 抛 EACCES（模拟权限 / 磁盘满） */
  failRename: boolean
  /** true ⇒ 所有 `readFileSync` 抛 EACCES（模拟"存在但读不到"） */
  failRead: boolean
  /** true ⇒ 下一次 `writeFileSync` 写入被**写坏**（内容追加"截断"），用来造"回读不一致" */
  corruptNextWrite: boolean
  /**
   * 路径**包含**其中任一片段时 `unlinkSync` 抛 `EPERM`。
   * 用来造"删不掉"（孤儿文件）：`unlink` 失败但文件还在。
   */
  failUnlinkFor: string[]
  /**
   * `n > 0` ⇒ 前 n 次读成功，第 n+1 次起抛 EACCES。
   * 用来构造"异步读 ok、同步 CAS 比对读不到"：`rawUpdate` 先异步读、再同步比对。
   */
  failReadAfter: number
  /** 装上假 OS（本用例内落盘/读盘都走它） */
  install(): void
  /** 卸掉 */
  uninstall(): void
  /** 读文本（不存在返回 undefined） */
  read(path: string): string | undefined
  /** 写文本（种子数据用；不计入 `writes`） */
  seed(path: string, text: string): void
  /** 列目录下的文件名 */
  list(dir: string): string[]
}

/** 建一个内存假文件系统（**不自动安装**，调 `install()` 才生效） */
export function installFakeFs(): FakeDisk {
  const files = new Map<string, string>()
  const writes: WriteRecord[] = []
  const dirs = new Set<string>(['/'])

  const state = {
    failWrite: false as boolean | string,
    failRename: false,

    failRead: false,
    corruptNextWrite: false,
    failReadAfter: 0,
    failReadArmed: false,
    failUnlinkFor: [] as string[],
  }

  const ensureDir = (p: string): void => {
    const parts = p.split('/').filter(Boolean)
    let cur = ''
    for (const part of parts) {
      cur += `/${part}`
      dirs.add(cur)
    }
  }

  const fakeFs = {
    mkdirSync: (p: string) => {
      ensureDir(p)
    },
    writeFileSync: (p: string, data: unknown) => {
      // **粘性**：置上后每次写都失败，直到用例显式清掉。
      // （一次性会让"写两次"的链路出现"第一次失败、第二次成功"，把断言带偏）
      if (state.failWrite) {
        const reason = typeof state.failWrite === 'string' ? state.failWrite : 'ENOSPC: 模拟写失败'
        throw new Error(reason)
      }
      // 文本与字节都收：库文件走 `writeBase64File`，落的是 Buffer
      if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
        throw new Error('fake-fs 只支持 string / Buffer 写')
      }
      writes.push({ path: p, text: typeof data === 'string' ? data : `<${data.length} bytes>` })
      // 「写坏」只对文本生效（造"回读不一致"用）；字节版另有 `corruptNextWrite` 的真磁盘用例
      if (state.corruptNextWrite && typeof data === 'string') {
        state.corruptNextWrite = false
        files.set(p, `${data}截断`)
        return
      }
      files.set(p, data)
    },
    renameSync: (from: string, to: string) => {
      if (state.failRename) {
        state.failRename = false
        throw new Error('EACCES: 模拟 rename 失败')
      }
      const text = files.get(from)
      if (text === undefined) throw new Error(`ENOENT: no such file, rename '${from}'`)
      files.delete(from)
      files.set(to, text)
    },
    unlinkSync: (p: string) => {
      if (state.failUnlinkFor.some((frag) => p.includes(frag))) {
        throw Object.assign(new Error(`EPERM: 模拟删不掉 ${p}`), { code: 'EPERM' })
      }
      if (!files.has(p)) throw new Error(`ENOENT: no such file, unlink '${p}'`)
      files.delete(p)
    },
    existsSync: (p: string) => files.has(p) || dirs.has(p),
    readFileSync: (p: string) => {
      // `failReadAfter = n`：前 n 次读成功，之后抛（用来让"异步读 ok、同步 CAS 比对读不到"）
      if (state.failReadArmed) {
        const error = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
        throw error
      }
      if (state.failReadAfter > 0) {
        state.failReadAfter -= 1
        if (state.failReadAfter === 0) state.failReadArmed = true
      }
      if (state.failRead) {
        const error = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
        throw error
      }
      const text = files.get(p)
      if (text === undefined) {
        const error = Object.assign(new Error(`ENOENT: no such file, open '${p}'`), {
          code: 'ENOENT',
        })
        throw error
      }
      return text
    },
    readdirSync: (p: string) => {
      const prefix = p.endsWith('/') ? p : `${p}/`
      const out: string[] = []
      for (const key of files.keys()) {
        if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) {
          out.push(key.slice(prefix.length))
        }
      }
      return out
    },
    statSync: (p: string) => {
      if (files.has(p)) return { isFile: () => true, size: files.get(p)!.length }
      if (dirs.has(p)) return { isFile: () => false, size: 0 }
      const error = Object.assign(new Error(`ENOENT: no such file, stat '${p}'`), {
        code: 'ENOENT',
      })
      throw error
    },
  }

  const handle: FakeDisk = {
    files,
    writes,
    get failWrite() {
      return state.failWrite
    },
    set failWrite(value: boolean | string) {
      state.failWrite = value
    },
    get failRename() {
      return state.failRename
    },
    set failRename(value: boolean) {
      state.failRename = value
    },
    get failRead() {
      return state.failRead
    },
    set failRead(value: boolean) {
      state.failRead = value
    },
    get corruptNextWrite() {
      return state.corruptNextWrite
    },
    set corruptNextWrite(value: boolean) {
      state.corruptNextWrite = value
    },
    get failUnlinkFor() {
      return state.failUnlinkFor
    },
    set failUnlinkFor(value: string[]) {
      state.failUnlinkFor = value
    },
    get failReadAfter() {
      return state.failReadAfter
    },
    set failReadAfter(value: number) {
      state.failReadAfter = value
      state.failReadArmed = false
    },
    install() {
      // 每次 install 都当成"新用例开始"：写记录清零（`files` 由用例自己 seed / clear）
      writes.length = 0
      state.failWrite = false
      state.failRename = false
      state.failRead = false
      state.failReadAfter = 0
      state.failReadArmed = false
      state.corruptNextWrite = false
      state.failUnlinkFor = []
      const w = window as unknown as { require?: (id: string) => unknown }
      w.require = (id: string) => (id === 'fs' ? fakeFs : realRequire(id))
    },
    uninstall() {
      delete (window as unknown as { require?: unknown }).require
    },
    read(path: string) {
      return files.get(path)
    },
    seed(path: string, text: string) {
      ensureDir(path.slice(0, path.lastIndexOf('/')) || '/')
      files.set(path, text)
    },
    list(dir: string) {
      return fakeFs.readdirSync(dir)
    },
  }

  return handle
}
