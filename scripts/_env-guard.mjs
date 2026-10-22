/**
 * 外部数据目录守卫。
 *
 * 这几个脚本的数据源不在仓里（原版源码、组件文档、webcrack 输出），换台机器或清理过就会缺。
 * 缺目录时给「缺什么 / 去哪找」，而不是把 ENOENT 堆栈糊到用户脸上。
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
  console.error('         本脚本要用仓外资料。把资料放到上面的路径再跑，')
  console.error('         或改用 docs/ 里的记录。清单见 AGENTS.md「我们有什么」§3。')
  console.error('')
  process.exit(2)
}
