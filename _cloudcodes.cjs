// CLOUD_* 码枚举核对：枚举定义 vs 实际流动（源码 + 测试）
const fs = require('fs')
const path = require('path')
const ROOTS = (process.env.SCAN_ROOTS || 'src,tests').split(',')
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

const enumDefFile = 'src/domain/cloud.ts'
const enumText = fs.readFileSync(enumDefFile, 'utf8')
const declared = [...enumText.matchAll(/'(CLOUD_[A-Z_]+)'/g)].map((m) => m[1])
const declaredSet = new Set(declared)

const where = {}
const flowing = new Set()
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  const lines = text.split(/\r?\n/)
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/'(CLOUD_[A-Z_]+)'/g)) {
      flowing.add(m[1])
      if (!where[m[1]]) where[m[1]] = []
      where[m[1]].push(f + ':' + (i + 1))
    }
  })
}

console.log('=== 枚举定义（src/domain/cloud.ts CloudErrorCode）===')
console.log('DECLARED_COUNT=' + declaredSet.size)
console.log([...declaredSet].sort().join(' '))
console.log('')
console.log('=== 全仓 ' + ROOTS.join('+') + ' 实际出现的 CLOUD_* 字面量 ===')
console.log('FLOWING_COUNT=' + flowing.size)
console.log([...flowing].sort().join(' '))
console.log('')
console.log('=== 在枚举里但全仓未出现（死码）===')
const dead = [...declaredSet].filter((c) => !flowing.has(c)).sort()
console.log(dead.length ? dead.join(' ') : '（无）')
console.log('')
console.log('=== 实际流动但不在枚举里（裸 string 混入）===')
const undeclared = [...flowing].filter((c) => !declaredSet.has(c)).sort()
console.log(undeclared.length ? undeclared.join(' ') : '（无）')
console.log('')
console.log('=== 每个码的出现位置（src/ 只列前 12 处）===')
for (const c of [...flowing].sort()) {
  const locs = where[c]
  const src = locs.filter((l) => l.startsWith('src'))
  console.log(c + '  总' + locs.length + '处 / src ' + src.length + '处  :: ' + src.slice(0, 12).join('  '))
}
