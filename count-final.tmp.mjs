// 最终口径：数「用户文案」的生产点。
//  口径（messages.ts:53-59）：算 = 这句话回答"刚才发生了什么"（失败/降级/成功/进度/要用户做什么/问用户确认）
//                     不算 = 按钮标签、菜单项、字段名、表头、标题、placeholder、aria-label、title、注释、<style>、演示页
//  分层：底座（src/domain src/utils src/commands src/cep src/stores src/cloud src/selection src/composables）
//        页面/组件（src/pages src/components），排除 _atoms/_probe/_placeholder
// 只读。用完即删。
import { readFileSync } from 'node:fs'

const files = readFileSync('filelist.txt', 'utf8').split(/\r?\n/).filter(Boolean)
const CJK = /[\u4e00-\u9fff]/

// 用户提示出口：这些调用/属性的参数里出现中文 = 用户文案
const OUTLET = [
  /feedback\.(ok|error|warn|info|push)\s*\(/,
  /confirm\.confirm\s*\(/,
  /\btoast\s*\(/,
  /notifyError\s*\(/,
  /\.invoke\(\s*[^,)]*,\s*[`'"]/, // useCommand 第二参 successText
  /\.invoke\(\s*\{[^}]*\}\s*,\s*[`'"]/, // invoke(payload, successText)
  /\.invoke\(\s*[^)]*,\s*msg\./,
]
// 明确的状态/空态/降级/进度/失败 文案常量
const STATE_DECL =
  /^(?:export\s+)?(?:const|let)\s+[A-Za-z_]*(?:EMPTY|TEXT|TITLE|HINT|NOTICE|TIP|LOADING|PROGRESS|STATE|DEGRADED|FAIL|WARN|LABEL)[A-Za-z_]*\s*(?::[^=]+)?=/
// 空态/降级 展示属性（页面 v-if 渲染给用户的）
const DISPLAY = /(?:v-if|v-else-if|:text|text=)="[^"]*(?:degraded|error|hint|empty|notice)[^"]*"/i

const rows = []
for (const f of files) {
  const isUi = /^src\/(pages|components)\//.test(f)
  if (isUi && /\/_(atoms|probe|placeholder)\//.test(f)) continue
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
    if (/^(type|interface|export type|export interface)\s/.test(t)) continue

    let kind = null
    if (zone === 'script') {
      if (OUTLET.some((r) => r.test(t))) kind = 'OUTLET'
      else if (STATE_DECL.test(t)) kind = 'STATE_CONST'
      else if (DISPLAY.test(t)) kind = 'DISPLAY'
    } else if (DISPLAY.test(t)) {
      const visible = t.replace(/<[^>]*>/g, '').trim()
      if (CJK.test(visible)) kind = 'DISPLAY'
    }
    if (kind) rows.push({ file: f, line: i + 1, kind, layer: isUi ? 'UI' : 'BASE', text: t.slice(0, 130) })
  }
}

// 分类：来自 msg.* 表（不是自写）vs 自写
const self = rows.filter((r) => !/msg\.[a-z]+\.(text|fn)\./.test(r.text))
const fromMsg = rows.filter((r) => /msg\.[a-z]+\.(text|fn)\./.test(r.text))

const ui = self.filter((r) => r.layer === 'UI')
const base = self.filter((r) => r.layer === 'BASE')
const tally = (list) => {
  const m = new Map()
  for (const r of list) m.set(r.file, (m.get(r.file) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

console.log('=== 用户提示语出口命中（去 msg.* 后 = 自写）===')
console.log('OUTLET_HITS_TOTAL', rows.length)
console.log('  from msg.* 表（非自写）', fromMsg.length)
console.log('  自写', self.length, '＝ 页面/组件', ui.length, '＋ 底座', base.length)
console.log('\n=== 自写 · 按层 ===')
console.log('页面/组件层文件数', new Set(ui.map((r) => r.file)).size, '行数', ui.length)
for (const [f, n] of tally(ui)) console.log(String(n).padStart(3), f)
console.log('\n底座层文件数', new Set(base.map((r) => r.file)).size, '行数', base.length)
for (const [f, n] of tally(base)) console.log(String(n).padStart(3), f)
console.log('\n=== 自写明细（全部）===')
for (const r of [...ui, ...base].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line))
  console.log(`${r.layer}\t${r.kind}\t${r.file}:${r.line}\t${r.text}`)
