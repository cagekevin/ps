// 只查不改 · 失败表达横切 · 计数器（可复现）
// 用法: node _scan.cjs <name> [list]  ; name 见 CASES
const fs = require('fs')
const path = require('path')

const ROOTS = (process.env.SCAN_ROOTS || 'src,tests,scripts,types').split(',')
const EXTS = new Set(['.ts', '.vue', '.js', '.mjs', '.tsx'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage'])

const files = []
function walk(dir) {
  let ents
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true })
  } catch (e) {
    return
  }
  for (const e of ents) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(p)
    } else if (EXTS.has(path.extname(e.name))) files.push(p)
  }
}
for (const r of ROOTS) if (fs.existsSync(r)) walk(r)

const CASES = {
  // ---- 判别字段名（读 .field）----
  'field-read': /\.(ok|status|kind|why|fail|shape|degraded|note|reason|result|state|error|code|cancelled|message)\b/g,
  'field-read-old': /\.(ok|status|kind|why|fail|shape|degraded|note|result|state)\b/g,
  // ---- 判别字段名（写 field:）----
  'field-write': /(?<![.\w])(ok|status|kind|why|fail|shape|degraded|note|reason|result|state|error|code|cancelled|message)\s*:/g,
  // ---- 旧口径 18-横切-解析 §2 表C ① ----
  'old10': /\.(ok|status|kind|why|fail|shape|degraded|note|result|state)\b|(?<![.\w])(ok|status|kind|why|fail|shape|degraded|note)\s*:/g,
  // ---- 形状数：成功/失败结果形状 ----
  'shape-ok': /(?:^|\s)ok\s*:/g,
  'shape-status': /(?:^|\s)status\s*:/g,
  'shape-kind': /(?:^|\s)kind\s*:/g,
  'shape-shape': /(?:^|\s)shape\s*:/g,
  'shape-fail': /(?:^|\s)fail\s*:/g,
  'shape-degraded': /(?:^|\s)degraded\s*:/g,
  'shape-note': /(?:^|\s)note\s*:/g,
  'shape-reason': /(?:^|\s)reason\s*:/g,
  'shape-result': /(?:^|\s)result\s*:/g,
  'shape-error': /(?:^|\s)error\s*:/g,
  'shape-code': /(?:^|\s)code\s*:/g,
  'shape-state': /(?:^|\s)state\s*:/g,
  // ---- 判别语法形态 ----
  'syntax-cmp': /\.(ok|status|kind|why|fail|shape|reason|result|code|state|degraded|note)\s*(?:===|!==)/g,
  'syntax-null': /(?:===|!==)\s*null\b|\bnull\s*(?:===|!==)/g,
  'syntax-truthy': /if\s*\(\s*!\w+\.(ok|success|status|result|error|code)\b/g,
  'syntax-predicate': /\bis(?:DecodeFail|JsxOkSentinel|Record|ArrayOf|CepError|CloudError|Error|String|Number|Array|Object|ActionWarehouse|RawTag|RawStar|CommonUseItem|KuEntry|SyncUnit)\s*\(/g,
  'syntax-throw': /\bthrow\s+(?:new\s+)?[A-Za-z_$]/g,
  'syntax-return-null': /\breturn\s+null\b/g,
  'syntax-return-arr': /\breturn\s+(\[\]|\{\})\b/g,
  'syntax-optional': /\?\.(ok|status|kind|fail|reason|result|value|data|code|error)\b/g,
  // ---- 兜底 ----
  'catch-empty': /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g,
  'catch-silent': /catch\s*\([^)]*\)\s*\{\s*(?:\/\/[^\n]*\n\s*)?\}/g,
  'catch-all': /\bcatch\s*\(/g,
  'nullish-default': /\?\?\s*(?:\[\]|\{\}|''|""|`[^`]*`|true|false|0\b)/g,
  'or-default': /\|\|\s*(?:\[\]|\{\}|''|""|true|false|0\b)/g,
  // ---- 自由文本失败 ----
  'free-text': /(?:reason|fail|note|message|error|why)\s*:\s*['"`][^'"`]*[一-龥][^'"`]*['"`]/g,
  'free-text-reason': /(?:reason|fail|note|why)\s*:\s*['"`][^'"`]*['"`]/g,
  // ---- 刀2 可忽略字段（裸形状）----
  'ignorable-field': /^\s{2}(?:ok|degraded|note|reason|error|message|code|status|kind|shape|result|fail|why|state)\??\s*:\s*(?:boolean|string|number)\s*$/gm,
  // ---- 云码 ----
  'cloud-code-lit': /'CLOUD_[A-Z_]+'/g,
  'cloud-code-quoted': /["']CLOUD_[A-Z_]+["']/g,
  'cloud-code-type': /['"]CLOUD_[A-Z_]+['"]/g,
  // ---- 跨进程 / CEP ----
  'jsx-result': /typedOutcome|asJsxOutcome|JsxOutcome/g,
  'eval-script': /evalScript|__adobe_cep__|\$\.evalFile/g,
  'err-read': /\.err\b/g,
  'transport-file': /transport\.ts|jsx-result\.ts/g,
  // ---- 绕过 ----
  'dot-value': /\.value\b/g,
  'b64-call': /b64ToUtf8\(/g,
}

const name = process.argv[2]
if (!name || !CASES[name]) {
  console.log('可用用例: ' + Object.keys(CASES).join(' '))
  process.exit(0)
}
const re = CASES[name]
const wantList = process.argv[3] === 'list'
let total = 0
const perFile = {}
const hits = []
for (const f of files) {
  let text
  try {
    text = fs.readFileSync(f, 'utf8')
  } catch (e) {
    continue
  }
  if (f.endsWith('.vue')) {
    // 只数 <script> 段，避免模板里的同名 token
    const m = text.match(/<script[^>]*>([\s\S]*?)<\/script>/g)
    text = m ? m.join('\n') : ''
  }
  const lines = text.split(/\r?\n/)
  const fileHits = []
  lines.forEach((l, i) => {
    const mm = l.match(re)
    if (mm) {
      total += mm.length
      fileHits.push({ line: i + 1, n: mm.length, text: l.trim().slice(0, 220) })
    }
  })
  if (fileHits.length) {
    perFile[f] = fileHits.reduce((a, b) => a + b.n, 0)
    if (wantList) {
      for (const h of fileHits) hits.push(`${f}:${h.line}(${h.n}) ${h.text}`)
    }
  }
}
if (wantList) console.log(hits.join('\n'))
console.log('--- ' + name + ' ---')
console.log('FILES_SCANNED=' + files.length)
console.log('FILES_WITH_HITS=' + Object.keys(perFile).length)
console.log('MATCHES=' + total)
console.log('PER_FILE:')
Object.entries(perFile)
  .sort((a, b) => b[1] - a[1])
  .forEach(([f, n]) => console.log('  ' + n + '\t' + f))
