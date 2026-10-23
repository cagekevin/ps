#!/usr/bin/env node
/**
 * 16-page-checklist.cjs
 * 把 `15-page-spec.cjs` 的页面规格，转成可直接贴进 `docs/页面/0N-*.md` 的「结构对照」章节。
 *
 * 为什么需要：15 号产出的是「脚本视角」（按组件、按源码顺序、含重复 class），
 * 而清单要的是「验收视角」——一个 class 一行、原版实测 vs 我方状态、带出处。
 * 两者不能混成一份文件：生成物要全量可重跑，清单要去重可打勾。
 *
 *   node 16-page-checklist.cjs          生成全部片段到 app/docs/页面/_片段/
 *   node 16-page-checklist.cjs --check  只报告每页会输出多少行
 *
 * 状态列默认 ☐（占位页）。已实现页的 ✅ 需要人工改，脚本不猜。
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const SPEC_DIR = path.join(ROOT, 'app', 'docs', '生成', '页面规格');
const OUT_DIR = path.join(ROOT, 'app', 'docs', '页面', '_片段');

const PAGES = [
  ['01-字体管理', '字体管理'],
  ['02-字体面板', '字体面板'],
  ['03-动作', '动作'],
  ['04-自定义', '自定义'],
  ['05-常用', '常用'],
  ['06-样式', '样式'],
  ['07-重命名', '重命名'],
  ['08-设置', '设置'],
];

/** 解析 15 号产出的 md：组件段 + 每段的 class 表 */
function parseSpec(text) {
  const comps = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^## (.+?)(?:（页面根）)?\s*$/);
    if (h && !line.startsWith('## 无 CSS')) {
      cur = { name: h[1].trim(), meta: '', rows: [] };
      comps.push(cur);
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('> render')) {
      cur.meta = line.replace(/^>\s*/, '').trim();
      continue;
    }
    const row = line.match(/^\| (\d+) \| `([^`]*)` \| (.*?) \|$/);
    if (row) cur.rows.push({ line: Number(row[1]), cls: row[2], style: row[3].trim() });
  }
  return comps;
}

/** 一个 class 一行：同一组件内重复出现的，只保留首次 */
function dedupe(rows) {
  const seen = new Map();
  for (const r of rows) {
    if (!r.cls) continue;
    if (!seen.has(r.cls)) seen.set(r.cls, r);
  }
  return [...seen.values()];
}

const onlyCheck = process.argv.includes('--check');
if (!onlyCheck) fs.mkdirSync(OUT_DIR, { recursive: true });

let totalRows = 0;
const report = [];

for (const [file, label] of PAGES) {
  const specPath = path.join(SPEC_DIR, `${file}.md`);
  if (!fs.existsSync(specPath)) {
    console.log(`⚠ 缺生成物：${file}.md（先跑 15-page-spec.cjs）`);
    continue;
  }
  const comps = parseSpec(fs.readFileSync(specPath, 'utf8'));

  const md = [];
  md.push('## 五、结构对照（逐项）');
  md.push('');
  md.push('> **脚本生成 + 人工补状态。** 原版列来自 `app.v4.js` 的 render 与 `app.bf68b505.css` 实测，行号即原版位置；');
  md.push('> 「我方」和状态列由人填：✅ 已实现 / ⚠️ 部分 / ☐ 未做。');
  md.push('> 同一组件内重复出现的 class 只保留首次；全量（含重复）见 `../生成/页面规格/' + file + '.md`。');
  md.push('');
  md.push('| 组件 | render | 根 class | class 数 |');
  md.push('|---|---|---|---|');
  let seq = 0;
  let pageRows = 0;
  for (const c of comps) {
    const rows = dedupe(c.rows);
    if (!rows.length) continue;
    seq++;
    pageRows += rows.length;
    const render = (c.meta.match(/render `([^`]+)`/) || [])[1] || '—';
    const root = (c.meta.match(/根 class `([^`]*)`/) || [])[1] || '—';
    md.push(`| ${c.name} | \`${render}\` | \`${root}\` | ${rows.length} |`);
  }
  md.push('');
  md.push(`> 本页 ${comps.length} 个组件、去重后 ${pageRows} 条 class。逐条对照在下面。`);
  md.push('');

  seq = 0;
  for (const c of comps) {
    const rows = dedupe(c.rows);
    if (!rows.length) continue;
    seq++;
    const render = (c.meta.match(/render `([^`]+)`/) || [])[1] || '—';
    const line = (c.meta.match(/行 (\d+)/) || [])[1] || '—';
    md.push(`### ${c.name}`);
    md.push('');
    md.push(`> render \`${render}\`，行 ${line}。`);
    md.push('');
    md.push('| 原版行 | class | 实测样式（出处） | 我方 | 状态 |');
    md.push('|---|---|---|---|---|');
    for (const r of rows) {
      const style = r.style
        .replace('—（该 class 无 CSS 规则，判定见文末）', '—（无 CSS 规则，纯标记）')
        .replace(/\|/g, '\\|');
      md.push(`| ${r.line} | \`${r.cls}\` | ${style} | — | ☐ |`);
    }
    md.push('');
  }

  totalRows += pageRows;
  report.push({ file, comps: comps.length, rows: pageRows });

  if (!onlyCheck) {
    const out = path.join(OUT_DIR, `${file}.md`);
    fs.writeFileSync(out, md.join('\n'), 'utf8');
    console.log(`✅ ${file}.md  组件 ${comps.length}　去重 class ${pageRows}`);
  } else {
    console.log(`${file.padEnd(16)} 组件 ${String(comps.length).padStart(2)}  去重 class ${pageRows}`);
  }
}

console.log(`\n合计：${report.length} 页，去重后 ${totalRows} 条可打勾项`);
if (!onlyCheck) {
  console.log(`片段 -> ${OUT_DIR}`);
  console.log('下一步：把片段替换掉清单里的「五、结构树与实测样式」整节，再人工填「我方 / 状态」两列。');
}
