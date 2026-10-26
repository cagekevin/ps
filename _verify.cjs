// 引用验真闸：把报告里所有 file:line / tests/… / commit / TD 逐条验
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const REPORT = 'daily/架构日志/18-横切-失败表达-调查结论-2026-10-26.md'
const txt = fs.readFileSync(REPORT, 'utf8')

// 全仓文件索引（按 basename 与相对路径）
const index = {}
const byBase = {}
;(function walk(d) {
  let ents
  try { ents = fs.readdirSync(d, { withFileTypes: true }) } catch (e) { return }
  for (const e of ents) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'coverage'].includes(e.name)) walk(p)
    } else index[p.replace(/\\/g, '/')] = p
  }
})('src')
;(function walk2(d) {
  let ents
  try { ents = fs.readdirSync(d, { withFileTypes: true }) } catch (e) { return }
  for (const e of ents) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (!['node_modules', '.git', 'dist', 'coverage'].includes(e.name)) walk2(p) }
    else { const k = p.replace(/\\/g, '/'); index[k] = p; if (!byBase[e.name]) byBase[e.name] = []; byBase[e.name].push(k) }
  }
})('tests')
for (const k of Object.keys(index)) {
  const b = path.basename(k)
  if (!byBase[b]) byBase[b] = []
  byBase[b].push(k)
}
// 顶层脚本/文档
for (const extra of ['scripts', 'docs', 'daily', '.codebuddy', 'types']) {
  if (fs.existsSync(extra)) {
    ;(function w(d) {
      let ents
      try { ents = fs.readdirSync(d, { withFileTypes: true }) } catch (e) { return }
      for (const e of ents) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) { if (!['node_modules', '.git', 'dist', 'coverage'].includes(e.name)) w(p) }
        else { const k = p.replace(/\\/g, '/'); index[k] = p; if (!byBase[e.name]) byBase[e.name] = []; byBase[e.name].push(k) }
      }
    })(extra)
  }
}

let ok = 0, bad = [], miss = []
const re = /([A-Za-z0-9_\-]+\.(?:ts|vue|mjs|md)):(\d+)(?:\s*\/\s*(\d+))?/g
let m
while ((m = re.exec(txt))) {
  const file = m[1], ln = parseInt(m[2], 10)
  const cands = byBase[file] || []
  if (!cands.length) { miss.push(file); continue }
  // 任一候选文件行号在范围内即算通过（basename 可能撞名，如 cloud/types.ts 与 cep/cloud/... ）
  let hit = null
  for (const p of cands) {
    const n = fs.readFileSync(p, 'utf8').split(/\r?\n/).length
    if (ln >= 1 && ln <= n) { hit = p; break }
  }
  if (hit) ok++
  else {
    const n0 = fs.readFileSync(cands[0], 'utf8').split(/\r?\n/).length
    bad.push(`${file}:${ln}（候选 ${cands.length} 个，最大 ${Math.max(...cands.map((c) => fs.readFileSync(c, 'utf8').split(/\r?\n/).length))} 行）`)
  }
}
console.log('=== file:line 引用 ===')
console.log('在范围内: ' + ok + '  越界: ' + bad.length + '  文件不存在: ' + miss.length)
if (bad.length) console.log('越界清单:\n  ' + [...new Set(bad)].join('\n  '))
if (miss.length) console.log('不存在清单:\n  ' + [...new Set(miss)].join('\n  '))

// tests/ 引用
console.log('')
console.log('=== tests/ 引用 ===')
const tRe = /(tests\/[A-Za-z0-9_\-\/]+\.ts)/g
let t
const tset = new Set()
while ((t = tRe.exec(txt))) tset.add(t[1])
for (const f of tset) console.log('  ' + (fs.existsSync(f) ? 'OK   ' : 'MISS ') + f)

// commit 引用
console.log('')
console.log('=== commit 引用 ===')
const cRe = /\b([0-9a-f]{7,40})\b/g
const cset = new Set()
while ((c = cRe.exec(txt))) cset.add(c[1])
for (const c of cset) {
  try {
    execSync('git cat-file -e ' + c, { stdio: 'ignore', shell: true })
    const info = execSync('git log -1 --format="%h %ci %s" ' + c, { encoding: 'utf8', shell: true }).trim()
    console.log('  OK   ' + c + '  ' + info.slice(0, 90))
  } catch (e) { console.log('  MISS ' + c) }
}

// TD 引用
console.log('')
console.log('=== TD 引用 ===')
const dRe = /TD-18-\d+/g
const dset = new Set()
while ((d = dRe.exec(txt))) dset.add(d[0])
const debt = {}
for (const f of ['daily/架构日志/债务.md', 'daily/架构日志/债务-归档.md']) {
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const mm = line.match(/^\|\s*(TD-\d+-\d+)/)
    if (mm) debt[mm[1]] = line
  }
}
for (const d of [...dset].sort()) console.log('  ' + (debt[d] ? 'OK   ' : 'MISS ') + d)

// 其它 18-横切-*.md
console.log('')
console.log('=== 其它 18-横切-*.md 引用 ===')
const hRe = /(18-横切-[A-Za-z0-9_\-\u4e00-\u9fa5]+\.md)/g
const hset = new Set()
while ((h = hRe.exec(txt))) hset.add(h[1])
for (const h of hset) {
  const found = fs.existsSync('daily/架构日志/' + h)
  let gitHas = false
  try { execSync(`git cat-file -e HEAD:${'daily/架构日志/' + h}`, { stdio: 'ignore' }); gitHas = true } catch (e) {}
  console.log('  ' + (found ? '工作区OK' : '工作区无') + ' / ' + (gitHas ? 'git OK' : 'git 无') + '  ' + h)
}
