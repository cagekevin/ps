/**
 * 注释死指针审计 —— 只读出报告，不写文件、不接门禁。
 *
 *   node scripts/comment-audit.mjs          # 人类可读
 *   node scripts/comment-audit.mjs --json   # 机器可读
 *
 * 三条判据（只判「指向的东西还在不在」，不判注释好坏）：
 *   1. 注释里写的文件路径在仓库里不存在            → missing-file
 *   2. 注释里写的 `npm run X` 在 package.json 里没有 → dead-command
 *   3. 注释里写的 `硬规则 N` 在 AGENTS.md 里已没有   → dead-rule
 *
 * 保护名单（永不报）：eslint-disable / @ts-expect-error / /// <reference / 断言理由 / UNVERIFIED。
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

const ROOT = process.cwd()
const SCAN_DIRS = ['src', 'tests']
const EXTS = ['.ts', '.vue']

const PROTECT = [
  /eslint-disable/,
  /@ts-expect-error/,
  /@ts-ignore/,
  /^\/\/\/\s*</,
  /断言理由/,
  /UNVERIFIED/,
]

const PATH_RE =
  /\b(?:docs|daily|src|scripts|tests)\/[^\s`'"（()）,，、|]+\.(?:md|ts|vue|mjs|cjs|json)/g
const CMD_RE = /npm run ([a-zA-Z][\w:]*)/g
const RULE_RE = /硬规则\s*(\d+)/g

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (EXTS.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}

/** .vue 只留 <script> 块；块外字符换成空格，保留换行 ⇒ 行号与原文一致 */
function normalize(text, file) {
  if (!file.endsWith('.vue')) return text
  const m = /<script\b[^>]*>([\s\S]*?)<\/script>/.exec(text)
  if (!m) return ''
  const bodyStart = m.index + m[0].indexOf('>') + 1
  const head = text.slice(0, bodyStart).replace(/[^\n]/g, ' ')
  const tail = text.slice(bodyStart + m[1].length).replace(/[^\n]/g, ' ')
  return head + m[1] + tail
}

function commentsOf(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text)
  const out = []
  for (;;) {
    const kind = scanner.scan()
    if (kind === ts.SyntaxKind.EndOfFileToken) break
    if (
      kind === ts.SyntaxKind.SingleLineCommentTrivia ||
      kind === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      out.push({ pos: scanner.getTokenPos(), text: scanner.getTokenText() })
    }
  }
  return out
}

function lineStarts(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1)
  return starts
}

function lineAt(starts, pos) {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= pos) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

function oneLine(s) {
  return s.replace(/\s+/g, ' ').trim().slice(0, 160)
}

const agents = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')
const scripts = Object.keys(
  JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts ?? {},
)

const issues = []
let fileCount = 0
let commentCount = 0
let protectedCount = 0

for (const dir of SCAN_DIRS) {
  if (!existsSync(join(ROOT, dir))) continue
  for (const abs of walk(join(ROOT, dir))) {
    fileCount++
    const file = relative(ROOT, abs).replace(/\\/g, '/')
    const text = normalize(readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), file)
    const starts = lineStarts(text)

    for (const c of commentsOf(text)) {
      commentCount++
      const line = lineAt(starts, c.pos)
      const body = c.text
      if (PROTECT.some((re) => re.test(body))) {
        protectedCount++
        continue
      }

      const push = (kind, why) => issues.push({ file, line, kind, text: oneLine(body), why })

      for (const m of body.matchAll(PATH_RE)) {
        const p = m[0].replace(/[.,;:]+$/, '')
        if (p.includes('*')) continue
        if (!existsSync(join(ROOT, p))) push('missing-file', `路径不存在：${p}`)
      }
      for (const m of body.matchAll(CMD_RE)) {
        if (!scripts.includes(m[1])) push('dead-command', `package.json 无该命令：npm run ${m[1]}`)
      }
      for (const m of body.matchAll(RULE_RE)) {
        if (!agents.includes(m[0])) push('dead-rule', `AGENTS.md 已无该条：${m[0]}`)
      }
    }
  }
}

const stats = {
  files: fileCount,
  comments: commentCount,
  protected: protectedCount,
  issues: issues.length,
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ stats, issues }, null, 2))
} else {
  let current = ''
  for (const it of issues) {
    if (it.file !== current) {
      current = it.file
      console.log(`\n${current}`)
    }
    console.log(`  ${String(it.line).padStart(4)}  [${it.kind}] ${it.text}`)
    console.log(`        ↳ ${it.why}`)
  }
  console.log(
    `\n扫描 ${stats.files} 文件 / ${stats.comments} 条注释 / 保护 ${stats.protected} 条 ⇒ 死指针 ${stats.issues} 处`,
  )
}
