// 二次包装：在整文件文本上做（跨行调用被拆成多行时 grep 单行抓不到）。
// 只读。用完即删。
import { readFileSync } from 'node:fs'

const files = readFileSync('srclist.txt', 'utf8').split(/\r?\n/).filter(Boolean)
const hits = []
for (const f of files) {
  const txt = readFileSync(f, 'utf8')
  // 归一：把换行+缩进折成单空格，便于跨行匹配
  const flat = txt.replace(/\r?\n\s*/g, ' ')
  const patterns = [
    ['MSG_FN_NESTED_MSG_FN', /msg\.[a-z]+\.fn\.[a-zA-Z]+\([^;{}]{0,200}?msg\.[a-z]+\.fn\.[a-zA-Z]+\(/g],
    ['MSG_TEXT_NESTED_MSG_FN', /msg\.[a-z]+\.text\.[a-zA-Z]+\([^;{}]{0,200}?msg\.[a-z]+\.fn\.[a-zA-Z]+\(/g],
    ['DESCRIBE_INSIDE_MSG', /msg\.[a-z]+\.(text|fn)\.[a-zA-Z]+\(?[^;{}]{0,200}?describeCepError\(/g],
    ['DESCRIBE_INSIDE_TPL', /`[^`]{0,200}\$\{describeCepError\([^}]{0,200}\}[^`]{0,200}`/g],
    ['REASON_PIPE_CONCAT', /(reason|error|message)\s*\|\|\s*['"`][^'"`]{2,}['"`]/g],
  ]
  for (const [name, re] of patterns) {
    let m
    while ((m = re.exec(flat))) {
      // 定位回原文行号
      const idx = m.index
      let line = 1
      for (let i = 0; i < idx; i++) if (txt[i] === '\n') line++
      const frag = flat.slice(Math.max(0, idx - 60), idx + 140)
      hits.push(`${f}:${line}\t${name}\t${frag.trim().slice(0, 170)}`)
    }
  }
}
console.log('TOTAL_WRAP_HITS', hits.length)
for (const h of hits) console.log(h)
