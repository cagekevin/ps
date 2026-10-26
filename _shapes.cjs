// 19 个形状的消费点数复算（读侧 + 写侧合并）
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
const NAMES = [
  'RepoFileOutcome', 'RepoRead', 'Decoded', 'DecodeFail', 'TextRead', 'Base64Read',
  'JsxOutcome', 'CommandOutcome', 'LedgerRead', 'CloudPullOutcome', 'SysFontRead',
  'ActionListRead', 'KuGroupsSource', 'WriteOutcome', 'SyncOutcome', 'UploadResult',
  'DownloadResult', 'PushUnitsResult', 'TranslateResult', 'PresetTextResult',
  'BatchOutcome', 'StyleLibrarySnapshot', 'SwatchConvertResult', 'SelectionWatchState',
  'ProvenKu', 'KuImportResult', 'WarehouseDeleteResult',
]
const counts = {}
const locs = {}
for (const f of files) {
  const t = read(f)
  for (const n of NAMES) {
    const re = new RegExp('\\b' + n + '\\b', 'g')
    const m = t.match(re)
    if (m) { counts[n] = (counts[n] || 0) + m.length; if (!locs[n]) locs[n] = []; locs[n].push(f + '×' + m.length) }
  }
}
console.log('=== 形状类型名的引用点数（src/，读+写+import 全算）===')
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([n, c]) => {
  console.log('  ' + String(c).padStart(3) + '  ' + n.padEnd(22) + '  ' + locs[n].slice(0, 6).join('  '))
})

// 判别字段名命中数（降序）
console.log('')
console.log('=== 判别字段名命中数（.field 读 + field: 写，src/）===')
const FIELDS = ['reason','code','error','message','cancelled','hostCode','ok','status','kind','why','fail','shape','degraded','note','result','state','success','value','data','payload','text','prefix','toast','err','outcome','snapshot','units','dropped','conflicts','inSync','dirty','warn','level','conflicts']
const seen = new Set()
const fc = {}
for (const f of files) {
  const t = read(f)
  for (const n of FIELDS) {
    if (seen.has(n)) continue
    const readRe = new RegExp('\\.' + n + '\\b', 'g')
    const writeRe = new RegExp("(?<![.\\w'\"])(?:^|[{,\\s])" + n + "(\\?)?\\s*:", 'g')
    const m = (t.match(readRe) || []).length + (t.match(writeRe) || []).length
    if (m) { fc[n] = (fc[n] || 0) + m }
  }
  for (const n of FIELDS) seen.add(n)
}
Object.entries(fc).sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log('  ' + String(c).padStart(4) + '  ' + n))
