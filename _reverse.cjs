// 反向查：从用户可见出口反查失败在哪一层被接住；找"写了失败臂但没人读"的形状
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

// 1. 用户可见出口
const OUTLETS = [
  [/feedback\.(error|warn|ok)\(/g, 'toast'],
  [/describeCepError\(/g, 'error-text'],
  [/throw new CepError\(/g, 'throw'],
  [/log\.(error|warn)\(/g, 'log'],
]
const outlets = {}
for (const f of files) {
  const t = read(f)
  for (const [re, name] of OUTLETS) {
    const m = t.match(re)
    if (m) outlets[name] = (outlets[name] || 0) + m.length
  }
}
console.log('=== 用户可见出口（src/）===')
for (const k of Object.keys(outlets)) console.log('  ' + k + ' = ' + outlets[k])

// 2. 失败臂写入点 vs 读取点
const ARMS = [
  ['ok:false', /ok:\s*false/g],
  ["status:'error'", /status:\s*'error'/g],
  ["status:'broken'", /status:\s*'broken'/g],
  ["status:'unreadable'", /status:\s*'unreadable'/g],
  ["kind:'bad'", /kind:\s*'bad'/g],
  ["fail:'shape'", /fail:\s*'shape'/g],
  ["fail:'badItem'", /fail:\s*'badItem'/g],
  ['ok:false-read', /\.ok\s*(?:===|!==)\s*false/g],
  ['ok-truthy-read', /if\s*\(\s*!\w+\.ok\b/g],
  ['status-error-read', /\.status\s*(?:===|!==)\s*'(error|broken|unreadable)'/g],
  ['kind-bad-read', /\.kind\s*(?:===|!==)\s*'bad'/g],
  ['fail-read', /\.fail\s*(?:===|!==)/g],
  ['shape-read', /\.shape\s*(?:===|!==)/g],
  ['isDecodeFail', /isDecodeFail\(/g],
  ['throw', /throw\s+(?:new\s+)?[A-Za-z_$]/g],
  ['return-null', /return\s+null\b/g],
]
const counts = {}
for (const f of files) {
  const t = read(f)
  for (const [name, re] of ARMS) {
    const m = t.match(re)
    if (m) counts[name] = (counts[name] || 0) + m.length
  }
}
console.log('')
console.log('=== 失败臂写 vs 读（src/）===')
for (const [name] of ARMS) console.log('  ' + name + ' = ' + (counts[name] || 0))

// 3. 谁读 PendingChange.code（CODE_TEXT 的输入）
console.log('')
console.log('=== pendingItems / code 消费点 ===')
for (const f of files) {
  const t = read(f)
  if (/pendingItems|\.code\b/.test(t)) {
    const lines = t.split(/\r?\n/)
    lines.forEach((l, i) => {
      if (/pendingItems|item\.code|\.code\b/.test(l)) console.log('  ' + f + ':' + (i + 1) + ': ' + l.trim().slice(0, 130))
    })
  }
}
