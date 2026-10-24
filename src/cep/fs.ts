import { CepError, ERR_PREFIX } from '@/utils/errors'
import { evalScriptRaw, hasCep } from './transport'
import { USER_DIR } from './env'

// CEP 的 require 返回 Node 内置模块，没有类型包；这里是唯一允许 any 的边界
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RequireFn = (id: string) => any

function getRequire(): RequireFn | null {
  const w = window
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
  // `process` 由 CEP 的 --enable-nodejs 注入（形状在 types/cep-node.d.ts）；
  // 无 Node 时它不存在，`?? {}` 保留：下一行 `nodeRequire('path')` 会抛 NO_NODE。
  const env = globalThis.process?.env ?? {}
  const path = nodeRequire('path')
  const os = nodeRequire('os')
  const roaming = env.APPDATA ?? path.join(os.homedir(), 'Library', 'Application Support')
  return toPosix(roaming) + USER_DIR
}

/**
 * 三态读取结果。
 *
 * **「文件不存在」与「读不到」必须分得开**：前者是首次使用的正常状态（可以给默认值），
 * 后者是错误——压成两态（`null`）就会让写路径拿 fallback 派生值覆盖用户文件（D-42 / T-105）。
 */
export type TextRead =
  { status: 'ok'; text: string } | { status: 'missing' } | { status: 'error'; reason: string }

/**
 * Node 侧三态读：`existsSync` 判「不存在」，`readFileSync` 抛错判「读不到」。
 * 两者**不许**合成一个 `null`——那是 T-105 的根因。
 */
function readTextNode(absPath: string): TextRead {
  try {
    const fs = nodeRequire('fs')
    if (!fs.existsSync(absPath)) return { status: 'missing' }
    return { status: 'ok', text: fs.readFileSync(absPath, 'utf8') as string }
  } catch (e) {
    return { status: 'error', reason: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * 两态同步读：`null` = **不存在或读不到**。
 *
 * **写路径不要用**：它分不清两者，正是 D-42 守不住的原因（T-105）。要分就用 `readTextOutcome`。
 * 保留它是因为 CAS 比对（`file-repo.ts` 的 `compareSync`）只关心"原文是不是这段"，不关心为什么不是。
 */
export function readTextFile(absPath: string): string | null {
  if (!hasNode()) return null
  const outcome = readTextNode(absPath)
  return outcome.status === 'ok' ? outcome.text : null
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

/** 目录占用（递归求和）；`bytes` 只算普通文件，不跟符号链接 */
export interface DirUsage {
  bytes: number
  files: number
}

/**
 * 递归统计一个目录的占用。**只读**，不删不改（清缓存命令没有证据，见 T-68）。
 *
 * 为什么不用 shell / jsx：CEP 里没有稳定的 `du`；Node 的 `readdirSync({withFileTypes})`
 * 在 CEP 12 的 Node 上够用。Node 不可用或目录不存在返回 `null`——调用方要显示「无法读取」，
 * 不许把 0 当成「空缓存」（那会把读失败说成"没缓存"）。
 */
export function dirUsage(absPath: string): DirUsage | null {
  if (!hasNode()) return null
  try {
    const fs = nodeRequire('fs')
    const path = nodeRequire('path')
    if (!fs.existsSync(absPath)) return null
    let bytes = 0
    let files = 0
    const walk = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true }) as {
        name: string
        isDirectory(): boolean
        isFile(): boolean
      }[]
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (!entry.isFile()) continue
        try {
          // 单个文件读不到大小就跳过：宁少算，不整次失败
          bytes += fs.statSync(full).size as number
          files += 1
        } catch {
          // 权限/占用中的文件
        }
      }
    }
    walk(absPath)
    return { bytes, files }
  } catch {
    return null
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
  // 不可达分支已删：两个调用点（`saveExportedText:251` 的 `nodeRequire('fs')`、
  // `writeTextFileAtomic:261` 的 `hasNode()`）都先证明 Node 在，`process` 必然存在。
  const pid = globalThis.process.pid
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

/**
 * jsx 侧「文件不存在」的固定前缀。**脚本拼的那句和这里解析的那句必须是同一个常量**——
 * 以前脚本标了它、解析处 `startsWith(ERR_PREFIX) → null` 又把它扔掉，三态就此压成两态（T-105）。
 */
const JSX_MISSING_PREFIX = '文件不存在: '

async function readTextViaJsxOutcome(absPath: string): Promise<TextRead> {
  const script =
    `(function(){try{var __f = new File(${JSON.stringify(toPosix(absPath))});` +
    `if(!__f.exists){return '${ERR_PREFIX}${JSX_MISSING_PREFIX}' + __f.fsName;}` +
    `__f.encoding = 'UTF-8'; __f.open('r'); var __s = __f.read(); __f.close(); return __s;}` +
    `catch(e){return '${ERR_PREFIX}' + ((e && e.message) ? e.message : String(e));}})()`
  try {
    const raw = await evalScriptRaw(script, 15000)
    if (!raw.startsWith(ERR_PREFIX)) return { status: 'ok', text: raw }
    const message = raw.slice(ERR_PREFIX.length)
    if (message.startsWith(JSX_MISSING_PREFIX)) return { status: 'missing' }
    return { status: 'error', reason: message }
  } catch (e) {
    return { status: 'error', reason: e instanceof Error ? e.message : String(e) }
  }
}

/** 两态：`null` = **不存在或读不到**。写路径不要用，见 `readTextOutcome` */
export async function readTextViaJsx(absPath: string): Promise<string | null> {
  const outcome = await readTextViaJsxOutcome(absPath)
  return outcome.status === 'ok' ? outcome.text : null
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

/**
 * 两态：`null` = **不存在或读不到**。写路径不要用，见 `readTextOutcome`。
 * Node 优先，失败再走 jsx File；浏览器里两者都没有，直接当读不到（不发注定失败的 evalScript）。
 */
export async function readTextSmart(absPath: string): Promise<string | null> {
  const text = readTextFile(absPath)
  if (text !== null) return text
  if (!hasCep()) return null
  return readTextViaJsx(absPath)
}

/**
 * **三态**读取：Node 优先，失败退 jsx `File`。
 *
 * 只有两条路都确认"没有这个文件"才返回 `missing`；只要有一条路说"读不到"，就是 `error`。
 * 写路径（`file-repo` 的 `update`）必须用它：读失败被当成"文件不存在"时，
 * `update` 会拿 `fallback()` 派生的值覆盖用户文件，而且因为"原文为空"连 `.bak` 都不留（D-42 / T-105）。
 */
export async function readTextOutcome(absPath: string): Promise<TextRead> {
  const node = hasNode() ? readTextNode(absPath) : null
  if (node?.status === 'ok') return node
  if (!hasCep()) return node ?? { status: 'error', reason: '当前环境没有 Node，也没有 CEP' }
  const viaJsx = await readTextViaJsxOutcome(absPath)
  if (viaJsx.status === 'ok') return viaJsx
  // 「读不到」优先于「不存在」：宁可报错，也不许把读失败降级成首次使用
  if (node?.status === 'error') return node
  return viaJsx
}
