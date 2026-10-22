/**
 * 工作日志：一篇一文件，文件名带日期，平铺在 `docs/日志/`。
 *
 *   node scripts/log.mjs new "门禁降级"   新建一篇
 *   node scripts/log.mjs index           重建 docs/日志/index.md
 *
 * 为什么不按年月分目录：集中开发期只有一个月，分出来也只会有一个子目录，
 * 多一层路径没有收益。文件名自带日期，排序即时间序；真到几百篇再考虑按年切。
 * 只在**决策 / 踩坑 / 横切机制变更**时写，日常改动不写。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const DIR = join(root, 'docs', '日志')
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

## 这次为什么没一次对（只在返工时填）

AGENTS「写代码前三个动作」里哪条没做：搜索 / 删除 / 先改第一页。
写清是哪一条、缺了什么事实，下次同类改动才能提前撞见。
`
}

/** 平铺目录，文件名即时间序 */
function listEntries() {
  if (!existsSync(DIR)) return []
  return readdirSync(DIR)
    .filter((file) => file.endsWith('.md') && file !== 'index.md')
    .sort()
    .reverse()
}

function rebuildIndex() {
  mkdirSync(DIR, { recursive: true })

  const rows = listEntries().map((rel) => {
    const text = readFileSync(join(DIR, rel), 'utf8')
    const heading = text.match(/^#\s*(.+)$/m)?.[1]?.trim() ?? rel
    const summary = text.match(/^>\s*(.+)$/m)?.[1]?.trim() ?? ''
    const [date, ...rest] = heading.split('·')
    return {
      date: date.trim(),
      title: rest.join('·').trim() || heading,
      summary,
      file: rel,
    }
  })

  const body = [
    '# 日志索引',
    '',
    '> 由 `npm run log:index` 生成，别手改。',
    '> 只在**决策、踩坑、架构变更**时写日志，不要每次改动都写。',
    '> 文件名即日期，平铺在本目录；排序就是时间序。',
    '',
    '| 日期 | 主题 | 摘要 | 文件 |',
    '|---|---|---|---|',
    ...rows.map(
      (r) => `| ${r.date} | ${r.title} | ${r.summary} | [${r.file}](${encodeURI(r.file)}) |`,
    ),
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
  const date = today()
  mkdirSync(DIR, { recursive: true })
  const file = join(DIR, `${date}-${slug(title)}.md`)
  if (existsSync(file)) {
    console.error(`[log] 已存在：${file}`)
    process.exit(1)
  }
  writeFileSync(file, template(date, title), 'utf8')
  console.log(`[log] 已创建 docs/日志/${date}-${slug(title)}.md`)
  rebuildIndex()
} else if (command === 'index') {
  rebuildIndex()
} else {
  console.error('用法：node scripts/log.mjs new "主题" | index')
  process.exit(1)
}
