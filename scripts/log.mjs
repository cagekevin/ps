/**
 * 工作日志：一篇一文件，不搞无限追加的 changelog。
 *
 *   node scripts/log.mjs new "门禁降级"   新建一篇（自动带日期和区块模板）
 *   node scripts/log.mjs index           重建 docs/log/index.md
 *
 * 为什么按文件分：单一 changelog 会越来越长、没人读、冲突多、没法按主题查。
 * 文件名带日期和主题，内部固定四个区块，索引自动生成。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const DIR = join(root, 'docs', 'log')
const INDEX = join(DIR, 'index.md')

function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function slug(title) {
  return title
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function template(date, title) {
  return `# ${date} · ${title}

> 一句话摘要（会进索引，控制在 40 字内）

## 背景

为什么要动这件事，当时卡在哪。

## 做了什么

只写结论和关键改动，不贴大段代码。

## 为什么

选这个方案而不是别的，代价是什么。

## 影响 / 后续

还有什么没做，或者留下了什么坑。
`
}

function rebuildIndex() {
  mkdirSync(DIR, { recursive: true })
  const files = readdirSync(DIR)
    .filter((f) => f.endsWith('.md') && f !== 'index.md')
    .sort()
    .reverse()

  const rows = []
  for (const file of files) {
    const text = readFileSync(join(DIR, file), 'utf8')
    const heading = text.match(/^#\s*(.+)$/m)?.[1]?.trim() ?? file
    const summary = text.match(/^>\s*(.+)$/m)?.[1]?.trim() ?? ''
    const [date, ...rest] = heading.split('·')
    rows.push({
      date: date.trim(),
      title: rest.join('·').trim() || heading,
      summary,
      file,
    })
  }

  const body = [
    '# 日志索引',
    '',
    '> 由 `npm run log:index` 生成，别手改。',
    '> 只在**决策、踩坑、架构变更**时写日志，不要每次改动都写。',
    '',
    '| 日期 | 主题 | 摘要 | 文件 |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.date} | ${r.title} | ${r.summary} | [${r.file}](${encodeURI(r.file)}) |`),
    '',
  ].join('\n')

  writeFileSync(INDEX, body, 'utf8')
  console.log(`[log] 索引已更新：${rows.length} 篇`)
}

const command = process.argv[2]

if (command === 'new') {
  const title = process.argv[3]
  if (!title) {
    console.error('用法：node scripts/log.mjs new "主题"')
    process.exit(1)
  }
  mkdirSync(DIR, { recursive: true })
  const date = today()
  const file = join(DIR, `${date}-${slug(title)}.md`)
  if (existsSync(file)) {
    console.error(`[log] 已存在：${file}`)
    process.exit(1)
  }
  writeFileSync(file, template(date, title), 'utf8')
  console.log(`[log] 已创建 docs/log/${date}-${slug(title)}.md`)
  rebuildIndex()
} else if (command === 'index') {
  rebuildIndex()
} else {
  console.error('用法：node scripts/log.mjs new "主题" | index')
  process.exit(1)
}
