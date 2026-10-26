// 统计「页面/组件层」里真正的中文提示语字面量：
//   1) 脚本区里单引号/双引号/反引号包裹的、含中文的字符串字面量
//   2) .vue 模板区里 >中文< 的文本节点
// 排除：注释行、<style>、import、type/interface 字段名（纯中文 key 仍算）
// 只读。用完即删。
import { readFileSync } from 'node:fs'

const files = readFileSync('filelist.txt', 'utf8').split(/\r?\n/).filter(Boolean)
const CJK = /[\u4e00-\u9fff]/
const rows = []

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split(/\r?\n/)
  let zone = f.endsWith('.vue') ? 'template' : 'script'
  let inBlock = false
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (f.endsWith('.vue')) {
      if (/^<script[\s>]/.test(t)) { zone = 'script'; continue }
      if (/^<\/script>/.test(t)) { zone = 'template'; continue }
      if (/^<style[\s>]/.test(t)) { zone = 'style'; continue }
      if (/^<\/style>/.test(t)) { zone = 'template'; continue }
    }
    if (zone === 'style') continue
    if (inBlock) { if (/\*\//.test(t)) inBlock = false; continue }
    if (/^\/\*/.test(t) && !/\*\/\s*$/.test(t)) { inBlock = true; continue }
    if (/^\/\//.test(t) || /^\*/.test(t) || /^\{\/\*/.test(t)) continue
    if (t.startsWith('import ') || t.startsWith('export type') || t.startsWith('import type')) continue
    if (!CJK.test(t)) continue

    if (zone === 'script') {
      // 只认字符串字面量（含中文）
      const m = t.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g)
      if (!m) continue
      for (const s of m) if (CJK.test(s)) rows.push({ zone, file: f, line: i + 1, text: s })
    } else {
      // 模板区：去掉标签后仍有中文可见文本
      const stripped = t.replace(/<[^>]*>/g, '')
      if (!CJK.test(stripped)) continue
      rows.push({ zone, file: f, line: i + 1, text: stripped.trim().slice(0, 80) })
    }
  }
}

const byZone = { script: 0, template: 0 }
const fileSet = new Set()
for (const r of rows) { byZone[r.zone]++; fileSet.add(r.file) }
console.log('SCRIPT_ZONE_CN_STRING_LITERALS', byZone.script)
console.log('TEMPLATE_ZONE_CN_TEXT_NODES', byZone.template)
console.log('TOTAL', rows.length, 'FILES', fileSet.size)
console.log('--- pages/components split ---')
const pg = rows.filter((r) => r.file.startsWith('src/pages/'))
const cp = rows.filter((r) => r.file.startsWith('src/components/'))
const ot = rows.filter((r) => !r.file.startsWith('src/pages/') && !r.file.startsWith('src/components/'))
console.log('src/pages', pg.length, 'files', new Set(pg.map((r) => r.file)).size)
console.log('src/components', cp.length, 'files', new Set(cp.map((r) => r.file)).size)
console.log('other layers', ot.length, 'files', new Set(ot.map((r) => r.file)).size)
console.log('--- all ---')
for (const r of rows) console.log(`${r.zone}\t${r.file}:${r.line}\t${r.text}`)
