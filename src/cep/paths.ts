// 是什么｜替代了什么｜谁在用
// 是什么：**路径的唯一定义处** —— 用户数据目录 / 扩展目录 / PS 脚本目录；调用方一律来这里取，不许自己拼
// 替代了什么：`cep/fs.ts:68-87`（`extensionDir` / `userDir`）与 `:351-367`（`psScriptsDir`）
// 谁在用：`data/*` 各仓库（`${userDir()}/${DATA_FILES.x}`）、`cloud/*`、`commands/*`、`cep/readonly.ts`（页面只拿 `userDir`）
// 别这么写：`process.env.APPDATA + '\\SheJiZhuLi'` —— 那是第二个路径判据，Windows/macOS 各漂一次

import { nodeRequire, toPosix } from './node'
import { evalScriptRaw, hasCep } from './transport'
import { USER_DIR } from './env'
import { ERR_PREFIX } from '@/utils/errors'

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
