// 动态凭据：造最小探针，证明某条失败臂真会被吞 / 某测试测不到失败分支
// 探针用完即删；本脚本只生成+运行+删除，不改 src 任何文件。
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = process.cwd()
const probe = process.argv[2]

function sh(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || ''), code: e.status }
  }
}

if (probe === 'typedOutcome-null') {
  // 探针 1：typedOutcome 的 decode 返 null ⇒ 只说"返回结构不认识"，label 之外零信息
  const src = fs.readFileSync('src/utils/jsx-result.ts', 'utf8')
  const js = src
    .replace(/import type[^\n]*\n/g, '')
    .replace(/import \{[^}]*\}[^\n]*\n/g, '')
    .replace(/export type/g, 'type')
    .replace(/export /g, '')
  fs.writeFileSync('_probe_typed.mjs', js + '\nconsole.log(JSON.stringify(typedOutcome({ok:true,data:42}, (d)=>null, "探针标签")))\n')
  const r = sh('node _probe_typed.mjs')
  console.log('探针1 typedOutcome(null) 输出: ' + r.out.trim())
  fs.unlinkSync('_probe_typed.mjs')
}

if (probe === 'cloudcode-untyped') {
  // 探针 2：CloudErrorCode 枚举里没有 CLOUD_OFFLINE 等 4 个实际流动码 ⇒ errorCode 是裸 string
  const src = fs.readFileSync('src/domain/cloud.ts', 'utf8')
  const enumBlock = src.match(/export type CloudErrorCode =([\s\S]*?)\n\nexport class/)[1]
  const declared = [...enumBlock.matchAll(/'(CLOUD_[A-Z_]+)'/g)].map((m) => m[1])
  console.log('枚举声明 ' + declared.length + ' 个：' + declared.join(' '))
  const all = new Set()
  for (const dir of ['src/cep/cloud', 'src/cloud']) {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.ts')) continue
      const t = fs.readFileSync(path.join(dir, f), 'utf8')
      for (const m of t.matchAll(/'(CLOUD_[A-Z_]+)'/g)) all.add(m[1])
    }
  }
  const undeclared = [...all].filter((c) => !declared.includes(c)).sort()
  console.log('实际流动 ' + all.size + ' 个；不在枚举里 ' + undeclared.length + ' 个：' + undeclared.join(' '))
  // 让 tsc 判死：把 errorCode 声明成裸 string 的地方
  console.log('--- UploadResult.errorCode 声明 ---')
  const types = fs.readFileSync('src/cloud/types.ts', 'utf8')
  const lines = types.split(/\r?\n/)
  lines.forEach((l, i) => { if (/errorCode/.test(l)) console.log('  types.ts:' + (i + 1) + ': ' + l.trim()) })
}

if (probe === 'test-fake-green') {
  // 探针 3：跑一条现存测试，看它是否真覆盖失败臂
  for (const t of [
    'tests/commands/cloud-codes.test.ts',
    'tests/pages/set-cloud-status.test.ts',
    'tests/cloud/pending-code.test.ts',
  ]) {
    if (!fs.existsSync(t)) { console.log(t + ' 不存在'); continue }
    const txt = fs.readFileSync(t, 'utf8')
    const cases = [...txt.matchAll(/\b(?:it|test)\(\s*['"`]([^'"`]+)/g)].map((m) => m[1])
    const failCases = cases.filter((c) => /失败|错误|权限|限流|离线|坏|读不到|unreadable|broken/.test(c))
    console.log('')
    console.log(t + '  用例总数 ' + cases.length + '  其中"失败类" ' + failCases.length)
    if (failCases.length) console.log('   失败类用例: ' + failCases.slice(0, 8).join(' | '))
    const hasNegative = /ok:\s*false|status:\s*'(error|broken|unreadable)'|errorCode:/.test(txt)
    console.log('   是否构造过失败臂: ' + hasNegative)
  }
}
