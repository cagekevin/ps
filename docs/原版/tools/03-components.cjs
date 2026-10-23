#!/usr/bin/env node
/**
 * 03-components.cjs  v2
 * 组件识别：改为按「data: function / methods: {」定位，不再依赖 name
 *
 * 输入：03-源码还原/webcrack输出/app/*.js
 * 输出：03-源码还原/组件/<名>.js + component-map.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const SRC = path.join(ROOT, '03-源码还原', 'webcrack输出', 'app');

/**
 * 单文件模式（2026-10-21 加）：webcrack 产物 `03-源码还原/` 已被清理，
 * 但 `reference/01-原版源码/panel/js/app.v4.js` 是同一份代码的合并可读版。
 * 切分逻辑（data:function / methods:{ 锚点 + 回溯对象起点）与文件数无关，所以直接读单文件。
 *
 * 输出**不写回 reference**：`reference/02-组件文档/` 是人工校对过的唯一可信源，
 * 重跑产物放 `tools/_out/`，对比后再合并。
 */
const SINGLE = path.join(ROOT, 'reference', '01-原版源码', 'panel', 'js', 'app.v4.js');
const OUT = path.join(__dirname, '_out', 'components');
const MAP = path.join(__dirname, '_out', 'component-map.json');

fs.mkdirSync(OUT, { recursive: true });

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

// 从某位置回溯到对象起点 {
function backToObjectStart(s, pos, limit) {
  let depth = 0;
  for (let k = pos; k >= 0 && k > pos - (limit || 12000); k--) {
    const c = s[k];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) return k;
      depth--;
    }
  }
  return -1;
}

/** 单文件优先；只有显式 `--legacy` 才走已删除的 webcrack 目录 */
let sources;
if (process.argv.includes('--legacy')) {
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js') && f !== 'deobfuscated.js');
  sources = files.map((f) => ({ name: f, text: fs.readFileSync(path.join(SRC, f), 'utf8') }));
  console.log('扫描 ' + files.length + ' 个模块（legacy 目录）...');
} else {
  sources = [{ name: 'app.v4.js', text: fs.readFileSync(SINGLE, 'utf8') }];
  console.log('扫描单文件 app.v4.js（' + (sources[0].text.length / 1048576).toFixed(2) + 'MB）...');
}

const seen = new Set();   // 对象起点去重
const components = [];
const usedNames = new Map();

for (const { name: f, text: s } of sources) {
  // 定位所有组件特征点
  const anchors = [];
  let m;
  const reData = /data\s*:\s*function\s*\(/g;
  while ((m = reData.exec(s)) !== null) anchors.push(m.index);
  const reMeth = /methods\s*:\s*\{/g;
  while ((m = reMeth.exec(s)) !== null) anchors.push(m.index);

  for (const pos of anchors) {
    const start = backToObjectStart(s, pos);
    if (start < 0) continue;
    const key = f + ':' + start;
    if (seen.has(key)) continue;
    seen.add(key);

    const end = matchBrace(s, start);
    if (end < 0) continue;
    const size = end - start;
    if (size < 40 || size > 400000) continue;

    const body = s.slice(start, end + 1);
    // 必须像组件：有 data 或 methods，且不是纯数据对象
    const hasData = /data\s*:\s*function/.test(body);
    const hasMethods = /methods\s*:\s*\{/.test(body);
    if (!hasData && !hasMethods) continue;

    // 组件名：优先 name，否则用行号
    const nm = body.match(/name\s*:\s*"([a-zA-Z][\w-]{2,40})"/);
    let name = nm ? nm[1] : null;
    const line = s.slice(0, start).split('\n').length;
    if (!name) name = 'anon_' + f.replace(/\.js$/, '') + '_L' + line;

    const dup = usedNames.get(name) || 0;
    usedNames.set(name, dup + 1);
    const fileName = (dup === 0 ? name : name + '_' + (dup + 1)) + '.js';

    components.push({
      name, file: f, fileName, start, end, size,
      hasData, hasMethods,
      hasRender: /_self\._c|_vm\._c|render\s*:/.test(body),
      hasProps: /props\s*:\s*[{[[]/.test(body),
      texts: (body.match(/[\u4e00-\u9fa5]{2,20}/g) || []).slice(0, 10),
      classes: [...new Set((body.match(/staticClass:\s*"([^"]{2,40})"/g) || []).map((x) => x.slice(15, -1)))].slice(0, 8),
      body,
    });
  }
}

console.log('识别到组件 ' + components.length + ' 个');

// 清空旧组件目录，避免残留
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith('.js')) fs.unlinkSync(path.join(OUT, f));
}

let written = 0;
for (const c of components) {
  fs.writeFileSync(path.join(OUT, c.fileName), c.body, 'utf8');
  written++;
}

fs.writeFileSync(MAP, JSON.stringify(components.map(({ body, ...r }) => r), null, 2), 'utf8');

console.log('已写出 ' + written + ' 个组件 -> ' + OUT);
console.log('映射 -> ' + MAP);

const named = components.filter((c) => !c.name.startsWith('anon_')).length;
console.log('\n有名字的: ' + named + '　匿名: ' + (components.length - named));
console.log('\n=== 最大的 12 个 ===');
[...components].sort((a, b) => b.size - a.size).slice(0, 12).forEach((c) => {
  console.log('  ' + c.name.padEnd(26) + (c.size / 1024).toFixed(1).padStart(7) + 'KB  '
    + (c.hasProps ? 'P' : '-') + (c.hasData ? 'D' : '-') + (c.hasMethods ? 'M' : '-') + (c.hasRender ? 'R' : '-'));
});
