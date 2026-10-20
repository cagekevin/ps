import { CepError, ERR_PREFIX, evalScriptRaw } from './eval-script'
import { USER_DIR } from './env'

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
  const env = (globalThis as any).process?.env ?? {}
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

/**
 * 用 ExtendScript 的 File 读文件——Node 不可用时的兜底。
 * 这样即使 manifest 少配了 --enable-nodejs，读数据文件也不会全废。
 */
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

/** Node 优先，失败再走 jsx File */
export async function readTextSmart(absPath: string): Promise<string | null> {
  return readTextFile(absPath) ?? (await readTextViaJsx(absPath))
}
