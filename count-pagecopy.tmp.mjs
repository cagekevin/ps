// 按 messages.ts:53-59 的仓内口径数「页面/组件层用户文案」：
//   算：失败/降级/成功/进度/要用户做什么/问用户确认（toast / feedback / confirm / 空态 / 状态）
//   不算：按钮标签、菜单项、字段名、表头、标题、placeholder、aria-label、title、注释、<style>、演示页
// 只读。用完即删。
import { readFileSync } from 'node:fs'

const files = readFileSync('filelist.txt', 'utf8').split(/\r?\n/).filter(Boolean)
const CJK = /[\u4e00-\u9fff]/

// 用户提示出口：这些调用/属性的参数里出现中文 = 用户文案
const PROMPT_CALL = [
  /feedback\.(ok|error|warn|info|push)\s*\(/,
  /confirm\.confirm\s*\(/,
  /\btoast\s*\(/,
]
// 明确的「状态/空态/进度」文案常量（按 messages.ts 口径）
const STATE_DECL = /^(const|let)\s+[A-Za-z_]*(EMPTY|TEXT|HINT|NOTICE|TIP|LOADING|PROGRESS|STATE|DEGRADED|PLACEHOLDER)[A-Za-z_]*\s*(:|=)/

const rows = []
for (const f of files) {
  if (!/^src\/(pages|components|composables)\//.test(f)) continue
  if (/\/_atoms\/|\/_probe\/|\/_placeholder\//.test(f)) continue // 演示/占位页不算产品文案
  const lines = readFileSync(f, 'utf8').split(/\r?\n/)
  let zone = f.endsWith('.vue') ? 'template' : 'script'
  let inBlock = false
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const t = raw.trim()
    if (f.endsWith('.vue')) {
      if (/^<script[\s>]/.test(t)) { zone = 'script'; continue }
      if (/^<\/script>/.test(t)) { zone = 'template'; continue }
      if (/^<style[\s>]/.test(t)) { zone = 'style'; continue }
      if (/^<\/style>/.test(t)) { zone = 'template'; continue }
    }
    if (zone === 'style') continue
    if (inBlock) { if (/\*\//.test(t)) inBlock = false; continue }
    if (/^\/\*/.test(t) && !/\*\/\s*$/.test(t)) { inBlock = true; continue }
    if (/^\/\//.test(t) || /^\*/.test(t) || /^\{\/\*/.test(t) || /^<!--/.test(t)) continue
    if (!CJK.test(t)) continue
    if (t.startsWith('import ')) continue

    let hit = null
    if (zone === 'script') {
      if (PROMPT_CALL.some((r) => r.test(t))) hit = 'PROMPT_OUTLET'
      else if (STATE_DECL.test(t)) hit = 'STATE_CONST'
      else {
        // 脚本区字符串字面量含中文，且不是 type/interface 字段
        if (/^(type|interface|export type|export interface)\s/.test(t)) continue
        const m = t.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g)
        if (m && m.some((s) => CJK.test(s))) hit = 'STRING_LITERAL'
      }
    } else {
      // 模板区：去掉标签与属性后仍有中文可见文本
      const visible = t.replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim()
      if (CJK.test(visible)) hit = 'TEMPLATE_TEXT'
    }
    if (hit) rows.push({ file: f, line: i + 1, kind: hit, text: t.slice(0, 120) })
  }
}

// 分类：来自 msg.* / CODE_REGISTRY 的（不是自写）vs 自写
const fromMsg = rows.filter((r) => /msg\.[a-z]+\.(text|fn)\./.test(r.text))
const selfWrite = rows.filter((r) => !/msg\.[a-z]+\.(text|fn)\./.test(r.text))

const byFile = (list) => {
  const m = new Map()
  for (const r of list) m.set(r.file, (m.get(r.file) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

console.log('### 页面/组件层中文文案行（含 msg.* 引用与自写）')
console.log('TOTAL_ROWS', rows.length, 'FILES', new Set(rows.map((r) => r.file)).size)
console.log('FROM_MSG', fromMsg.length, ' SELF_WRITTEN', selfWrite.length)
console.log('\n### 自写文案逐文件（降序）')
for (const [f, n] of byFile(selfWrite)) console.log(String(n).padStart(3), f)
console.log('\n### 自写明细')
for (const r of selfWrite) console.log(`${r.kind}\t${r.file}:${r.line}\t${r.text}`)
