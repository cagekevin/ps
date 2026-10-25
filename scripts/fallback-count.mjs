// 是什么：兜底计数器——按「拆兜底六形态」数 src/** 里的兜底代码，供「减一·兜底净减」给改前改后对照
// 替代了什么：之前只靠感觉说"没增加兜底"，没给可复算的数
// 谁在用：人跑 `node scripts/fallback-count.mjs` 复算；改前跑 `git stash` + 本脚本，改后再跑一次对比
// 禁止：不许在此手填数；只读不改 src/。先用 maskComments 遮蔽注释，注释里的示例不算。

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { maskComments } from './source-scan.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')
function walk(dir, exts = ['.ts', '.vue'], out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, exts, out)
    else if (exts.some((x) => e.name.endsWith(x))) out.push(relative(ROOT, p))
  }
  return out
}

// 六形态 → 正则（遮蔽注释后按行匹配）
const FORMS = {
  '1 静默吞（空 catch / .catch(()=>)）': [
    /\bcatch\s*\{\s*\}/,
    /\.catch\(\s*\(\s*\)\s*=>\s*(?:\{\s*\}|undefined|null)/,
  ],
  '2 失败归一空值（return []/null 在错误路径）': [
    /\breturn\s*\[\s*\]/,
    /\breturn\s+null\b/,
    /\?\?\s*\[\s*\]/,
    /\?\?\s*''/,
  ],
  '3 默认值兜底（?? 默认值）': [/\?\?\s*(?:\[\s*\]|''|""|0|false|\{\s*\})/],
  '4 UI 提前宣告成功（待人工核）': [],
  '5 占位对象事后补（待人工核）': [],
  '6 单入口补偿（待人工核）': [],
}
const files = walk(SRC)
const counts = {}
for (const form of Object.keys(FORMS)) counts[form] = 0
const detail = {}
for (const f of files) {
  const masked = maskComments(readFileSync(join(ROOT, f), 'utf8'))
  const lines = masked.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const [form, res] of Object.entries(FORMS)) {
      for (const re of res) {
        if (re.test(lines[i])) {
          counts[form]++
          ;(detail[form] = detail[form] || []).push(`${f}:${i + 1}`)
        }
      }
    }
  }
}
console.log('=== 兜底计数（六形态，遮蔽注释后）===')
let total = 0
for (const [form, n] of Object.entries(counts)) {
  console.log(`  ${form}: ${n}`)
  total += n
}
console.log(`  合计（1-3 形态机器可数；4-6 需人工核）: ${total}`)
