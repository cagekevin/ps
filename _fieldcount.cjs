// 逐个字段的命中数（读 + 写），降序输出
const fs = require('fs')
const path = require('path')
const ROOTS = (process.env.SCAN_ROOTS || 'src').split(',')
const EXTS = new Set(['.ts', '.vue', '.js', '.mjs'])
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage'])
const files = []
function walk(d) {
  let ents
  try { ents = fs.readdirSync(d, { withFileTypes: true }) } catch (e) { return }
  for (const e of ents) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p) }
    else if (EXTS.has(path.extname(e.name))) files.push(p)
  }
}
for (const r of ROOTS) if (fs.existsSync(r)) walk(r)
const read = (f) => {
  let t = fs.readFileSync(f, 'utf8')
  if (f.endsWith('.vue')) {
    const m = t.match(/<script[^>]*>([\s\S]*?)<\/script>/g)
    t = m ? m.join('\n') : ''
  }
  return t
}
const FIELDS = ['reason','code','error','message','cancelled','hostCode','ok','status','kind','why','fail','shape','degraded','note','result','state','success','value','data','payload','text','prefix','toast','err','outcome','snapshot','units','dropped','conflicts','inSync','dirty','warn','level']
const fc = {}
for (const f of files) {
  const t = read(f)
  for (const n of FIELDS) {
    const readRe = new RegExp('\\.' + n + '\\b', 'g')
    const writeRe = new RegExp("(?<![.\\w'\"])(?:^|[{,\\s])" + n + "(\\?)?\\s*:", 'g')
    const m = (t.match(readRe) || []).length + (t.match(writeRe) || []).length
    if (m) fc[n] = (fc[n] || 0) + m
  }
}
Object.entries(fc).sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log('  ' + String(c).padStart(4) + '  ' + n))
console.log('TOTAL=' + Object.keys(fc).length + ' SUM=' + Object.values(fc).reduce((a, b) => a + b, 0))
