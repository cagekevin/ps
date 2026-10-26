// 是什么｜替代了什么｜谁在用
// 是什么：**路径的唯一定义处** —— 数据根 / 用户数据目录 / 扩展目录 / PS 脚本目录；调用方一律来这里取，不许自己拼
// 替代了什么：`cep/fs.ts:68-87`（`extensionDir` / `userDir`）与 `:351-367`（`psScriptsDir`）
// 谁在用：`data/*` 各仓库（`${userDir()}/${DATA_FILES.x}`）、`cloud/*`、`commands/*`、`cep/readonly.ts`（页面只拿 `userDir`）
// 别这么写：`process.env.APPDATA + '\\SheJiZhuLi'` —— 那是第二个路径判据，Windows/macOS 各漂一次
//
// ── 四段各管一件事（刀 4：一个函数只干一件）───────────────────────────────────
// `toLocalPath(uri)`  —— 纯解析：CEP 桥的 URI → 本地路径（decodeURI + 剥 file:// + 去尾斜杠）
// `hostAppDataRoot()` —— 观测：问宿主要数据根（判桥 / 判方法 / 调 / 判空），拿不到就抛
// `appDataRoot()`     —— 判据：选来源（宿主优先，无桥才用平台默认）
// `userDir()`         —— 派生：`appDataRoot() + USER_DIR`
// 谁要"根"就调 `appDataRoot()`，**不许**再 `dirname(userDir())` / `slice(0,-USER_DIR.length)` 反推。

import { nodeRequire, toPosix } from './node'
import { evalScriptRaw, hasCep } from './transport'
import { USER_DIR } from './env'
import { CepError, ERR_PREFIX } from '@/utils/errors'
import { msg } from '@/domain/messages'

/**
 * CEP 桥给的 URI → 本地路径（**纯函数**）。
 *
 * 裸桥返的是 URI：CSInterface.js 的 `getSystemPath` 就是 `decodeURI` 之后再剥前缀
 * （macOS 的 `Application Support` 含空格，不 decode 就是 `%20`）。
 *
 * ⚠️ **剥几个斜杠是平台相关的**：Windows 剥 `file:///`（`file:///C:/…` → `C:/…`），
 * macOS 只剥 `file://`（`file:///Users/…` → `/Users/…`，绝对路径的前导斜杠必须留住）。
 * 本仓不引入"平台判断"（那条路正是本 bug 的老根），所以改用**形状**判：剥完若不是盘符
 * 开头（`X:/`）且没有前导斜杠，就补回去 —— 两个平台都对，且不猜平台。
 *
 * 畸形 `%` 序列会抛 `URIError`；调用方必须自己接住并转成 `CepError`（这里不接，保持纯）。
 */
export function toLocalPath(uri: string): string {
  const path = toPosix(decodeURI(uri))
    .replace(/^file:\/*/, '')
    .replace(/\/+$/, '')
  // 空串仍是空串 —— 补斜杠会把"拿不到"伪装成根目录 `/`
  if (!path) return ''
  // Windows 盘符路径（`C:/…`）本来就以前缀开头；其余（POSIX 绝对路径）补回前导斜杠
  if (!/^[A-Za-z]:\//.test(path) && !path.startsWith('/')) return `/${path}`
  return path
}

/**
 * 问宿主要数据根。**桥在就必须给，给不出就抛** —— 不许静默落回平台默认：
 * 落回去在 Windows 上就是 `homedir + /Library/Application Support` 那个错目录（本仓真事故）。
 *
 * 桥不在（vitest / jsdom）返回 `null`，由 `appDataRoot()` 决定退到哪里。
 */
function hostAppDataRoot(): string | null {
  const bridge = window.__adobe_cep__
  if (!bridge) return null

  // "方法缺失"也算拿不到：老 CEP / 桥被部分注入时 `getSystemPath` 可能不存在。
  if (typeof bridge.getSystemPath !== 'function') {
    throw new CepError('IO', msg.ps.fn.userDataUnavailable('CEP 桥没有 getSystemPath'))
  }

  let raw: string
  try {
    raw = bridge.getSystemPath('userData')
  } catch (e) {
    // ADR-0014 扩展一 出口③：转成 CepError 带原因重抛（不静默、不降级）
    const reason = e instanceof Error ? e.message : String(e)
    throw new CepError('IO', msg.ps.fn.userDataUnavailable(reason))
  }

  // `raw` 必须是字符串：桥返 `undefined` 时 `decodeURI(undefined)` 会给出字符串
  // `"undefined"`（truthy），`if (!root)` 挡不住 ⇒ 静默返回 `"undefined/SheJiZhuLi"`。
  if (typeof raw !== 'string') {
    throw new CepError('IO', msg.ps.fn.userDataUnavailable(`返回的不是字符串（${typeof raw}）`))
  }

  let root: string
  try {
    root = toLocalPath(raw)
  } catch (e) {
    // `decodeURI` 抛 `URIError` 不许穿透成非 `CepError`
    const reason = e instanceof Error ? e.message : String(e)
    throw new CepError('IO', msg.ps.fn.userDataUnavailable(reason))
  }
  if (!root) throw new CepError('IO', msg.ps.fn.userDataUnavailable(raw))
  return root
}

/**
 * **数据根**（Windows `%APPDATA%` / macOS `~/Library/Application Support`）—— 唯一入口。
 *
 * 色板（`%APPDATA%/FengZiSeBan/`）这类**兄弟目录**要的就是根，不是 `userDir()`；
 * 以前它们各自 `dirname(userDir())` / `slice(0,-USER_DIR.length)` 反推，那是第二份判据。
 */
export function appDataRoot(): string {
  // ① 宿主优先：CEP 的 `userData` 在 Windows 给 `%APPDATA%`、在 macOS 给
  //    `~/Library/Application Support`，平台差异由 CEP 吃掉 —— 原版 `sf.js:21` 用的就是
  //    同一个 API（`cs.getSystemPath(SystemPath.USER_DATA)`），完全不碰 `process.env`。
  const viaHost = hostAppDataRoot()
  if (viaHost !== null) return viaHost

  // ② 非 CEP（vitest / jsdom / 无桥）：一条链服务两个平台 —— Windows 用 `APPDATA`；
  //    macOS 没有 `APPDATA`，用 `homedir + /Library/Application Support`（那正是 Mac 上
  //    用户实际在用的目录）。两个候选各在一个平台正确，删任一个都会让某平台算错。
  //    `process` 由 CEP 的 --enable-nodejs 注入（形状在 types/cep-node.d.ts）；
  //    无 Node 时它不存在，`?? {}` 保留：下一行 `nodeRequire('path')` 会抛 NO_NODE。
  const env = globalThis.process?.env ?? {}
  const path = nodeRequire('path')
  const os = nodeRequire('os')
  const roaming = env.APPDATA ?? path.join(os.homedir(), 'Library', 'Application Support')
  return toPosix(roaming)
}

/** 用户数据目录（扩展自己的那份），如 `C:/Users/x/AppData/Roaming/SheJiZhuLi` */
export function userDir(): string {
  return appDataRoot() + USER_DIR
}

/**
 * 扩展所在目录（不带 `file://` 前缀，正斜杠）。
 *
 * **失败一律抛**（与 `appDataRoot()` 同一形状）：以前失败返 `''`，而
 * `commands/action.ts:306` 直接 `` `${extensionDir()}/preset/…` `` 不判空 ⇒ 空串被静默拼成
 * `/preset/…`（`TD-13-3`）。"同一个失败在同一层两种形状"就是 `TD-13-1` 那类分裂。
 */
export function extensionDir(): string {
  const bridge = window.__adobe_cep__
  if (!bridge) throw new CepError('INIT', msg.ps.text.extDirUnavailable)

  let uri: string
  try {
    uri = bridge.getSystemPath('extension')
  } catch (e) {
    throw new CepError(
      'INIT',
      msg.ps.text.extDirUnavailable,
      e instanceof Error ? e.message : String(e),
    )
  }
  if (typeof uri !== 'string' || !uri) throw new CepError('INIT', msg.ps.text.extDirUnavailable)

  let dir: string
  try {
    dir = toLocalPath(uri)
  } catch (e) {
    throw new CepError(
      'INIT',
      msg.ps.text.extDirUnavailable,
      e instanceof Error ? e.message : String(e),
    )
  }
  if (!dir) throw new CepError('INIT', msg.ps.text.extDirUnavailable)
  return dir
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
