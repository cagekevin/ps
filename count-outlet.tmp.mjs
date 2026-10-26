// 判「页面/组件层自写中文提示语」的精确口径：
//  只数 feedback.* / confirm / CepModal / toast / prompt / ElMessage 类「用户提示出口」的调用参数
//  与 .vue 模板里语义上算提示语的可见文本。
// 只读。用完即删。
import { readFileSync } from 'node:fs'

const files = readFileSync('filelist.txt', 'utf8').split(/\r?\n/).filter(Boolean)
const CJK = /[\u4e00-\u9fff]/
const rows = []
const OUTLETS = [
  /feedback\.(ok|error|warn|info|push)\s*\(/,
  /confirm\.confirm\s*\(/,
  /\btoast\s*\(/,
  /\bprompt\s*\(/,
  /\bopenPrompt\s*\(/,
  /CepModal/,
  /notifyError\s*\(/,
]

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (/^\/\//.test(t) || /^\*/.test(t) || /^\/\*/.test(t) || /^\{\/\*/.test(t)) continue
    if (!OUTLETS.some((r) => r.test(t))) continue
    if (!CJK.test(t)) continue
    rows.push(`${f}:${i + 1}\t${t.slice(0, 130)}`)
  }
}
console.log('CJK_AT_OUTLET_CALLSITES', rows.length)
console.log('---')
for (const r of rows) console.log(r)
