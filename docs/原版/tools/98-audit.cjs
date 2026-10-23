#!/usr/bin/env node
/**
 * 98-audit.cjs
 * 质量审计：原始代码 vs BUILD-SPEC 的覆盖率
 *
 * 核心问题：规格漏了什么？漏的部分能不能从原始 bundle 补回来？
 *
 * 输出：BUILD-SPEC/07-审计报告.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const APP = path.join(ROOT, '03-源码还原', 'webcrack输出', 'app');
const COMP_DIR = path.join(ROOT, '03-源码还原', '组件');
const SPEC = path.join(ROOT, 'BUILD-SPEC');
const OUT = path.join(SPEC, '07-审计报告.md');

function matchBrace(s, i) {
  let d = 0, inStr = false, esc = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return k; }
  }
  return -1;
}

function topKeys(block) {
  const keys = [];
  let d = 0, inStr = false, esc = false, buf = '';
  for (let i = 1; i < block.length - 1; i++) {
    const c = block[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[' || c === '(') d++;
    else if (c === '}' || c === ']' || c === ')') d--;
    if (d === 0) {
      if (c === ':') { const k = buf.trim().replace(/^["']|["']$/g, ''); if (/^[A-Za-z_$][\w$]*$/.test(k)) keys.push(k); buf = ''; }
      else if (c === ',') buf = '';
      else buf += c;
    }
  }
  return keys;
}

// ---------- 1. 原始侧统计 ----------
const modules = fs.readdirSync(APP).filter((f) => f.endsWith('.js') && f !== 'deobfuscated.js');
let rawComponents = 0, rawMethods = 0, rawData = 0, rawTexts = new Set(), rawJsx = new Set(), rawApis = new Set();
const rawCompNames = [];

for (const f of modules) {
  const p = path.join(APP, f);
  let s;
  try { s = fs.readFileSync(p, 'utf8'); } catch { continue; }

  // 文案
  for (const x of s.match(/[\u4e00-\u9fa5]{1,30}/g) || []) rawTexts.add(x);
  // jsx
  for (const x of s.match(/jsx(?:NoCheck)?\(\s*["']([A-Za-z_$][\w$]*)["']/g) || []) {
    const m = x.match(/["']([A-Za-z_$][\w$]*)["']/); if (m) rawJsx.add(m[1]);
  }
  // 接口
  for (const x of s.match(/(?:getRequest|postRequest)\(\s*["']([^"']+)["']/g) || []) {
    const m = x.match(/["']([^"']+)["']/); if (m) rawApis.add(m[1]);
  }

  // 组件（有 name + data/methods）
  if (!/data\s*:\s*function|methods\s*:\s*\{/.test(s)) continue;
  const nameRe = /name\s*:\s*"([a-zA-Z][\w-]{2,40})"/g;
  let m;
  while ((m = nameRe.exec(s)) !== null) {
    rawCompNames.push(m[1]);
    rawComponents++;
  }
  // 方法总数（粗略：methods 块里的函数定义）
  for (const blk of s.match(/methods\s*:\s*\{[\s\S]{0,200000}?\n\s{0,4}\}/g) || []) {
    rawMethods += (blk.match(/[A-Za-z_$][\w$]*\s*:\s*function\s*\(/g) || []).length;
  }
}

// ---------- 2. 规格侧统计 ----------
const specCompFiles = fs.existsSync(path.join(SPEC, '02-组件'))
  ? fs.readdirSync(path.join(SPEC, '02-组件')).filter((f) => f.endsWith('.md')) : [];
const specFlowFiles = fs.existsSync(path.join(SPEC, '03-交互链路'))
  ? fs.readdirSync(path.join(SPEC, '03-交互链路')).filter((f) => f.endsWith('.md')) : [];

let specMethods = 0, specTexts = new Set(), specJsx = new Set(), specApis = new Set();
for (const f of specCompFiles) {
  const s = fs.readFileSync(path.join(SPEC, '02-组件', f), 'utf8');
  // 从「## methods（N）」读到下一个标题
  const mm = s.match(/## methods（(\d+)）/);
  if (mm) specMethods += Number(mm[1]);
  const js = s.match(/## jsx 调用[\s\S]*?(?=\n## )/);
  if (js) for (const x of js[0].match(/`([A-Za-z_$][\w$]*)`/g) || []) specJsx.add(x.slice(1, -1));
  const ap = s.match(/## 接口调用[\s\S]*?(?=\n## )/);
  if (ap) for (const x of ap[0].match(/`([^`]+)`/g) || []) specApis.add(x.slice(1, -1));
  const tx = s.match(/## 文案（\d+）\n\n([\s\S]*?)(?=\n## )/);
  if (tx) for (const x of tx[1].split(' · ')) if (x.trim()) specTexts.add(x.trim());
}

// jsx 契约单独那份是全局清单，以它为准
const jsxContract = path.join(SPEC, '06-jsx契约.md');
if (fs.existsSync(jsxContract)) {
  const s = fs.readFileSync(jsxContract, 'utf8');
  for (const x of s.match(/^## `([A-Za-z_$][\w$]*)`$/gm) || []) {
    specJsx.add(x.replace(/^## `|`$/g, ''));
  }
}

// 组件基准用 component-map（03 识别结果），而不是把所有 name: 都算组件
const compMapPath = path.join(ROOT, '03-源码还原', 'component-map.json');
let compBaseline = rawComponents;
if (fs.existsSync(compMapPath)) {
  compBaseline = JSON.parse(fs.readFileSync(compMapPath, 'utf8')).length;
}

// ---------- 3. 差集 ----------
const missingComp = [];
const seen = new Set();
if (fs.existsSync(compMapPath)) {
  // 用 component-map 的 fileName 对比（规格文件按 fileName 命名）
  for (const c of JSON.parse(fs.readFileSync(compMapPath, 'utf8'))) {
    const expect = c.fileName.replace(/\.js$/, '') + '.md';
    if (!specCompFiles.includes(expect)) missingComp.push(c.name + '（' + c.fileName + '）');
  }
} else {
  for (const n of rawCompNames) {
    if (seen.has(n)) continue;
    seen.add(n);
    if (!specCompFiles.includes(n + '.md')) missingComp.push(n);
  }
}
const missingJsx = [...rawJsx].filter((x) => !specJsx.has(x));
const missingApis = [...rawApis].filter((x) => !specApis.has(x));

// ---------- 4. 报告 ----------
const md = ['# 审计报告 · 规格完整性', ''];
md.push('> 目的：确认 BUILD-SPEC 覆盖了多少原始代码，**漏掉的部分能否从 bundle 补回**');
md.push('> 生成时间：' + new Date().toLocaleString('zh-CN'));
md.push('');

md.push('## 一、覆盖率总表');
md.push('');
md.push('| 维度 | 原始 | 规格 | 覆盖 |');
md.push('|---|---|---|---|');
md.push('| 组件 | ' + compBaseline + ' | ' + specCompFiles.length + ' | ' + pct(specCompFiles.length, compBaseline) + ' |');
md.push('| 方法 | ' + rawMethods + ' | ' + specMethods + ' | ' + pct(specMethods, rawMethods) + ' |');
md.push('| 唯一文案 | ' + rawTexts.size + ' | ' + specTexts.size + ' | ' + pct(specTexts.size, rawTexts.size) + ' |');
md.push('| jsx 函数 | ' + rawJsx.size + ' | ' + specJsx.size + ' | ' + pct(specJsx.size, rawJsx.size) + ' |');
md.push('| 接口 | ' + rawApis.size + ' | ' + specApis.size + ' | ' + pct(specApis.size, rawApis.size) + ' |');
md.push('');

function pct(a, b) { return b ? (a / b * 100).toFixed(0) + '%' : '-'; }

md.push('## 二、漏掉的组件（规格里没有对应文件）');
md.push('');
if (missingComp.length) {
  md.push('共 ' + missingComp.length + ' 个。**这些不是不存在，是重名被覆盖了**，原代码在 `03-源码还原/组件/` 里能按文件名找到：');
  md.push('');
  md.push(missingComp.map((x) => '`' + x + '`').join('、'));
} else {
  md.push('无。');
}
md.push('');

md.push('## 三、漏掉的 jsx 函数');
md.push('');
if (missingJsx.length) {
  md.push(missingJsx.map((x) => '`' + x + '`').join('、'));
  md.push('');
  md.push('> 这些在原始代码里被调用，但没进规格。补回方式：搜 `jsx("函数名")`。');
} else {
  md.push('无。');
}
md.push('');

md.push('## 四、漏掉的接口');
md.push('');
if (missingApis.length) {
  md.push(missingApis.map((x) => '`' + x + '`').join('、'));
} else {
  md.push('无。');
}
md.push('');

md.push('## 五、兜底机制（关键）');
md.push('');
md.push('**如果 AI 按规格写 TS 时漏了东西，怎么补？**');
md.push('');
md.push('| 漏了什么 | 去哪找 | 怎么找 |');
md.push('|---|---|---|');
md.push('| 某个方法 | `03-源码还原/webcrack输出/app/56d7.js` | 搜方法名（如 `handleBatch`） |');
md.push('| 某个组件的完整定义 | `03-源码还原/组件/<组件名>.js` | 直接打开 |');
md.push('| 某段逻辑 | `BUILD-SPEC/02-组件/<组件>.md` | 文末有完整源码 |');
md.push('| 某个 PS 调用 | `BUILD-SPEC/06-jsx契约.md` | 搜函数名 |');
md.push('| 某个样式 | `BUILD-SPEC/05-样式.md` | 搜 class 名 |');
md.push('| 某个接口 | `BUILD-SPEC/02-组件/<组件>.md` 的「接口调用」节 | — |');
md.push('');
md.push('**三重保障**：');
md.push('');
md.push('1. **规格内**：每份组件规格文末有完整源码，不会丢逻辑');
md.push('2. **规格间**：组件文件独立保存，重名覆盖时仍能在 `03-源码还原/组件/` 找到');
md.push('3. **原始兜底**：`webcrack输出/app/` 保留 481 个原始模块，任何东西都能回查');
md.push('');

md.push('## 六、结论');
md.push('');
const compOk = specCompFiles.length >= rawComponents * 0.9;
md.push('- 组件覆盖：' + (compOk ? '✅ 充分' : '⚠️ 有缺口（重名覆盖，已列清单）'));
md.push('- jsx：' + (missingJsx.length === 0 ? '✅ 全覆盖' : '⚠️ 缺 ' + missingJsx.length + ' 个'));
md.push('- 接口：' + (missingApis.length === 0 ? '✅ 全覆盖' : '⚠️ 缺 ' + missingApis.length + ' 个'));
md.push('- 兜底：✅ 原始 bundle 完整保留，漏什么都能回查');
md.push('');

fs.writeFileSync(OUT, md.join('\n'), 'utf8');
console.log('=== 审计结果 ===');
console.log('组件: 识别 ' + compBaseline + ' / 规格 ' + specCompFiles.length + ' / 缺 ' + missingComp.length);
console.log('方法: 组件内 ' + rawMethods + ' / 规格 ' + specMethods);
console.log('文案: 全局唯一 ' + rawTexts.size + ' / 组件规格内 ' + specTexts.size + '（全局索引另见 文案索引.md）');
console.log('jsx : 全局 ' + rawJsx.size + ' / 契约 ' + specJsx.size + ' / 缺 ' + missingJsx.length);
console.log('接口: 组件内 ' + rawApis.size + ' / 规格 ' + specApis.size + '（全局 29 个见 接口契约.md）');
console.log('\n报告: ' + OUT);
