import { CepError, ERR_PREFIX } from '@/utils/errors'
import { evalScriptRaw, hasCep } from './transport'
import { USER_DIR } from './env'

// CEP 的 require 返回 Node 内置模块，没有类型包；这里是唯一允许 any 的边界
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RequireFn = (id: string) => any

function getRequire(): RequireFn | null {
  const w = window as unknown as { require?: RequireFn; cep_node?: { require?: RequireFn } }
  if (typeof w.require === 'function') return w.require
  if (typeof w.cep_node?.require === 'function') return w.cep_node.require
  return null
}

/** CEP 是否开了 --enable-nodejs */
export function hasNode(): boolean {
  return getRequire() !== null
}

// 同上：Node 内置模块的类型由调用方自己决定
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nodeRequire<T = any>(id: string): T {
  const req = getRequire()
  if (!req) throw new CepError('NO_NODE', 'Node 不可用，检查 manifest 里的 --enable-nodejs')
  return req(id) as T
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/')
}

/** 扩展所在目录（不带 file:// 前缀，正斜杠） */
export function extensionDir(): string {
  const bridge = window.__adobe_cep__
  if (!bridge) return ''
  try {
    return toPosix(decodeURI(bridge.getSystemPath('extension'))).replace(/^file:\/{2,3}/, '')
  } catch {
    return ''
  }
}

/** 用户数据目录，如 C:/Users/x/AppData/Roaming/SheJiZhuLi */
export function userDir(): string {
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
  const env = g.process?.env ?? {}
  const path = nodeRequire('path')
  const os = nodeRequire('os')
  const roaming = env.APPDATA ?? path.join(os.homedir(), 'Library', 'Application Support')
  return toPosix(roaming) + USER_DIR
}

/** 用 Node 读文件，失败返回 null（不抛） */
export function readTextFile(absPath: string): string | null {
  if (!hasNode()) return null
  try {
    const fs = nodeRequire('fs')
    if (!fs.existsSync(absPath)) return null
    return fs.readFileSync(absPath, 'utf8') as string
  } catch {
    return null
  }
}

/** 用 Node 写文件，目录不存在会建 */
export function writeTextFile(absPath: string, text: string): void {
  const fs = nodeRequire('fs')
  const path = nodeRequire('path')
  fs.mkdirSync(path.dirname(absPath), { recursive: true })
  fs.writeFileSync(absPath, text, 'utf8')
}

/** 读文件为 base64；失败返回 null */
export function readBase64File(absPath: string): string | null {
  if (!hasNode()) return null
  try {
    const fs = nodeRequire('fs')
    if (!fs.existsSync(absPath)) return null
    return fs.readFileSync(absPath).toString('base64') as string
  } catch {
    return null
  }
}

/** 写 base64 到文件；目录不存在会建 */
export function writeBase64File(absPath: string, base64: string): boolean {
  if (!hasNode()) return false
  try {
    const fs = nodeRequire('fs')
    const path = nodeRequire('path')
    const buffer = nodeRequire<{ Buffer: { from(data: string, encoding: string): unknown } }>(
      'buffer',
    ).Buffer
    fs.mkdirSync(path.dirname(absPath), { recursive: true })
    fs.writeFileSync(absPath, buffer.from(base64, 'base64'))
    return true
  } catch {
    return false
  }
}

/**
 * base64 → UTF-8 文本。库文件 `.kus/.kug/.kux` 的 `data` 字段就是 `base64(库文件 JSON 文本)`。
 *
 * 原版走 `cep.encoding.convertion.b64_to_utf8`（`app.v4.js:72751-72760`）；
 * 这里用 `atob` + `TextDecoder`，CEP 与 Node/jsdom 都有，不依赖 `cep.encoding`。
 * 调用方必须先判 `typeof data === 'string'`——布尔 `false` 会在这里抛（契约 §2.5）。
 */
export function b64ToUtf8(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * UTF-8 文本 → base64。与 `b64ToUtf8` 成对：库文件导出时 `data = base64(库文件 JSON 文本)`（契约 §1.1 ②）。
 * 契约 §1.1 ② 的 `data` 就是这一层；不依赖 `cep.encoding`。
 */
export function utf8ToB64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  // 分块拼，避免 20 万字符级库文件逐字符追加时的长字符串开销
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/** 删除文件；文件不存在视为成功（原版 delete 同语义） */
export function removeFile(absPath: string): boolean {
  if (!hasNode()) return false
  try {
    const fs = nodeRequire('fs')
    if (!fs.existsSync(absPath)) return true
    fs.unlinkSync(absPath)
    return true
  } catch {
    return false
  }
}

/**
 * 用 ExtendScript 的 File 读文件——Node 不可用时的兜底。
 * 这样即使 manifest 少配了 --enable-nodejs，读数据文件也不会全废。
 */
let tmpSeq = 0

/**
 * 本进程专属的临时文件名（D-42）。
 *
 * 之前固定用 `${absPath}.tmp`：主面板和独立面板是两个进程，同一份数据文件 = 同一个 tmp 名。
 * A 写到一半 → B 截断重写 → A 的 rename 落盘的就是 B 的半截内容，**文件损坏**，
 * 比丢一次更新更糟（丢更新只少一条，损坏会让下次读回退默认值）。
 *
 * 带 pid + 进程内序号 + 随机串后两个进程互不覆盖；同一文件系统内 rename 仍是原子的。
 */
function uniqueTmpPath(absPath: string): string {
  const g = globalThis as unknown as { process?: { pid?: number } }
  const pid = g.process?.pid ?? 0
  tmpSeq += 1
  return `${absPath}.${pid}-${tmpSeq}-${Math.random().toString(36).slice(2, 8)}.tmp`
}

/** 写 tmp 失败时别把垃圾文件留在用户目录里 */
function dropTmp(fs: { unlinkSync: (path: string) => void }, tmp: string): void {
  try {
    fs.unlinkSync(tmp)
  } catch {
    // tmp 可能根本没写出来，删不掉属正常
  }
}

/** 写 tmp → rename；失败清理 tmp 并抛 */
function atomicReplace(absPath: string, text: string): void {
  const fs = nodeRequire('fs')
  const tmp = uniqueTmpPath(absPath)
  try {
    writeTextFile(tmp, text)
    fs.renameSync(tmp, absPath)
  } catch (e) {
    dropTmp(fs, tmp)
    throw e
  }
}

/**
 * 写「用户自己选的路径」的导出文件。
 *
 * 为什么不用通用的 `writeTextFile`：AGENTS.md §17 的判据是
 * `grep -rn "readTextFile\|writeTextFile" src/pages src/commands` 必须为 0——
 * 通用写只给 data 层用；命令层要往用户选的路径写导出文件，走这个窄入口。
 *
 * 原子写：先写本进程专属的 tmp 再改名，避免写到一半崩溃留下半截 JSON。
 * 失败抛（NO_NODE / 磁盘错）——不许假装写成功。
 */
export function saveExportedText(absPath: string, text: string): void {
  const fs = nodeRequire('fs')
  const path = nodeRequire('path')
  fs.mkdirSync(path.dirname(absPath), { recursive: true })
  atomicReplace(absPath, text)
}

/**
 * 原子写：先写本进程专属的 tmp 再改名，避免写到一半崩溃留下半截 JSON。
 * Node 不可用时返回 false，调用方退回普通写。
 */
export function writeTextFileAtomic(absPath: string, text: string): boolean {
  if (!hasNode()) return false
  try {
    atomicReplace(absPath, text)
    return true
  } catch {
    return false
  }
}

export async function readTextViaJsx(absPath: string): Promise<string | null> {
  const script =
    `(function(){try{var __f = new File(${JSON.stringify(toPosix(absPath))});` +
    `if(!__f.exists){return '${ERR_PREFIX}文件不存在: ' + __f.fsName;}` +
    `__f.encoding = 'UTF-8'; __f.open('r'); var __s = __f.read(); __f.close(); return __s;}` +
    `catch(e){return '${ERR_PREFIX}' + ((e && e.message) ? e.message : String(e));}})()`
  try {
    const raw = await evalScriptRaw(script, 15000)
    if (raw.startsWith(ERR_PREFIX)) return null
    return raw
  } catch {
    return null
  }
}

/**
 * PS 的 `Presets/Scripts` 目录（写 jsx 脚本用）。
 *
 * UNVERIFIED: 路径解析策略未在真机确认。原版走 `copyToScripts`（`docs/页面/08-设置.md:372-386`），
 * 我们复刻同一路径：`app.version` 拼 `~/Documents/Adobe/Adobe Photoshop <版本>/Presets/Scripts`，
 * 找不到就返回 null——调用方必须报错，**不许静默跳过**。
 */
export async function psScriptsDir(): Promise<string | null> {
  if (!hasCep()) return null
  const script =
    `(function(){try{` +
    `var __v = app.version;` +
    `var __base = Folder.desktop.parent;` +
    `var __s = new Folder(__base.fsName + "/Adobe/Adobe Photoshop " + __v + "/Presets/Scripts");` +
    `return __s.fsName;}` +
    `catch(e){return '${ERR_PREFIX}' + ((e && e.message) ? e.message : String(e));}})()`
  try {
    const raw = await evalScriptRaw(script, 15000)
    if (raw.startsWith(ERR_PREFIX)) return null
    return toPosix(raw)
  } catch {
    return null
  }
}

/** Node 优先，失败再走 jsx File；浏览器里两者都没有，直接当读不到（不发注定失败的 evalScript） */
export async function readTextSmart(absPath: string): Promise<string | null> {
  const text = readTextFile(absPath)
  if (text !== null) return text
  if (!hasCep()) return null
  return readTextViaJsx(absPath)
}
