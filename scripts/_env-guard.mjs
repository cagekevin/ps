/**
 * 外部数据目录守卫。
 *
 * 原版一手证据已入库到 docs/原版/；仍有少数数据源不在仓库（webcrack 解包输出、真机抓包）。
 * 缺目录说明工作区不完整，此时给「缺什么 / 去哪找」，而不是把 ENOENT 堆栈糊到用户脸上。
 *
 * 退出码约定：
 *   0 = 成功    1 = 脚本自己出错    2 = 外部数据路径不在（不是 bug，先把资料放好）
 */
import { existsSync } from 'node:fs'

/**
 * @param {string} absPath 需要存在的目录/文件绝对路径
 * @param {string} hint 缺了以后怎么办（一句话）
 */
export function requireExternal(absPath, hint) {
  if (existsSync(absPath)) return
  console.error('')
  console.error(`[缺数据] 路径不在：${absPath}`)
  console.error(`         ${hint}`)
  console.error('         原版资料在 docs/原版/（已入库）。路径不在说明工作区不完整：')
  console.error('         先 git status 确认没漏文件，别改脚本绕过。清单见 docs/原版/README.md。')
  console.error('')
  process.exit(2)
}
