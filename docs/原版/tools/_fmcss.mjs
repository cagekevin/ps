import { readFileSync } from 'node:fs'

const css = readFileSync(
  '../reference/01-原版源码/panel/css/app.bf68b505.css',
  'utf8',
)
const rules = css.split('}').map((r) => r.trim()).filter((r) => r.includes('{'))

const groups = {
  '页面骨架': /font-manage(\s|__layouts|__header|__content|\{)/,
  '用户标签区': /user-tag-filter/,
  '标签 chip': /font-manage__tag/,
  '搜索/筛选': /font-manage__(search|filter-preview)/,
  '列表': /font-manage__list/,
  '字重': /font-manage__font-weight/,
  '星级': /font-manage__rating/,
  '预览设置': /font-manage__preview/,
}

for (const [name, re] of Object.entries(groups)) {
  const hits = rules.filter((r) => re.test(r.split('{')[0]))
  console.log(`\n########## ${name}（${hits.length} 条）`)
  for (const r of hits) console.log(r.replace(/\s+/g, ' ') + '}')
}
