// 判别字段名「种数」复算：读 .field + 写 field: 两侧合并去重
const fs = require('fs')
const path = require('path')
const ROOTS = (process.env.SCAN_ROOTS || 'src,tests,scripts,types').split(',')
const EXTS = new Set(['.ts', '.vue', '.js', '.mjs', '.tsx'])
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

const FIELDS = [
  'ok', 'status', 'kind', 'why', 'fail', 'shape', 'degraded', 'note', 'reason',
  'result', 'state', 'error', 'code', 'cancelled', 'message', 'success',
  'value', 'data', 'payload', 'text', 'prefix', 'toast', 'hostCode', 'err',
  'outcome', 'snapshot', 'units', 'dropped', 'conflicts', 'inSync', 'dirty',
  'degrade', 'warning', 'warn', 'level', 'severity', 'stage', 'phase',
]
const readNames = new Set()
const writeNames = new Set()
const readRe = new RegExp('\\.(' + FIELDS.join('|') + ')\\b', 'g')
const writeRe = new RegExp("(?<![.\\w'\"])(?:^|[{,\\s])(" + FIELDS.join('|') + ")(\\?)?\\s*:", 'g')
const occurrences = {}
for (const f of files) {
  let text
  try { text = fs.readFileSync(f, 'utf8') } catch (e) { continue }
  if (f.endsWith('.vue')) {
    const m = text.match(/<script[^>]*>([\s\S]*?)<\/script>/g)
    text = m ? m.join('\n') : ''
  }
  let m
  readRe.lastIndex = 0
  while ((m = readRe.exec(text))) { readNames.add(m[1]); occurrences[m[1]] = (occurrences[m[1]] || 0) + 1 }
  writeRe.lastIndex = 0
  while ((m = writeRe.exec(text))) { writeNames.add(m[1]); occurrences[m[1]] = (occurrences[m[1]] || 0) + 1 }
}
console.log('FILES=' + files.length)
console.log('READ_NAMES=' + [...readNames].sort().join(' '))
console.log('WRITE_NAMES=' + [...writeNames].sort().join(' '))
const all = new Set([...readNames, ...writeNames])
console.log('SPECIES_READ=' + readNames.size)
console.log('SPECIES_WRITE=' + writeNames.size)
console.log('SPECIES_ALL=' + all.size)
console.log('ALL_NAMES=' + [...all].sort().join(' '))
