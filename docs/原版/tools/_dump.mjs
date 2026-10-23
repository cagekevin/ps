import { readFileSync } from 'node:fs'

const css = readFileSync(
  '../reference/01-原版源码/panel/css/app.bf68b505.css',
  'utf8',
)
const rules = css.split('}').map((r) => r.trim()).filter((r) => r.includes('{'))

const key = process.argv[2] ?? 'list-item'
const re = new RegExp(key)

const hits = rules.filter((r) => re.test(r.split('{')[0]))
console.log(`=== ${key}：${hits.length} 条 ===`)
for (const r of hits) console.log(r.replace(/\s+/g, ' ') + '}')
