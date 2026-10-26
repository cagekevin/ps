// 数「同一个失败被拼几次」：把 CepError 的第 2 参 → describeCepError → useCommand → feedback.error 这条链
// 上每一处「再包一层」的点找出来。只读。用完即删。
// 具体动作：找出形如 X(Y( 或 `${A}：${B}` 的二次包装模式里，Y/A 本身已是完整文案的地方。
import { readFileSync } from 'node:fs'

const files = readFileSync('srclist.txt', 'utf8').split(/\r?\n/).filter(Boolean)
const CJK = /[\u4e00-\u9fff]/

// 找 msg.*.fn.*( 调用里嵌套了另一个 msg.*.fn.*( 或 describeCepError( 的（= 文案包文案）
const wrap = []
for (const f of files) {
  const txt = readFileSync(f, 'utf8')
  const lines = txt.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]
    if (!CJK.test(t)) continue
    if (/^\s*(\/\/|\*|\/\*)/.test(t)) continue
    // 模式：msg.xxx.fn.yyy( ... msg.xxx.fn.zzz(  或  describeCepError(
    if (/msg\.[a-z]+\.fn\.[a-zA-Z]+\([^)]*msg\.[a-z]+\.fn\.[a-zA-Z]+\(/.test(t.replace(/\n/g, ' '))) {
      wrap.push(`${f}:${i + 1}\tNESTED_MSG_FN\t${t.trim().slice(0, 120)}`)
    } else if (/msg\.[a-z]+\.(text|fn)\.[a-zA-Z]+\(?[^)]*describeCepError\(/.test(t.replace(/\n/g, ' '))) {
      wrap.push(`${f}:${i + 1}\tMSG_WRAPS_DESCRIBE\t${t.trim().slice(0, 120)}`)
    }
  }
}
console.log('WRAP_SITES', wrap.length)
for (const w of wrap) console.log(w)

// 前缀型：CODE_REGISTRY 的 prefix + message，再被 msg.*.fn 包一次
console.log('--- CODE_REGISTRY prefix entries (double prefix risk) ---')
const cr = readFileSync('src/utils/code-registry.ts', 'utf8')
for (const line of cr.split(/\r?\n/)) if (/prefix:/.test(line)) console.log('  ' + line.trim())
