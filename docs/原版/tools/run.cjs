#!/usr/bin/env node
/**
 * run.cjs —— 逆向流水线一键入口
 *
 * 用法：
 *   node run.cjs            跑全部步骤
 *   node run.cjs 03 04      只跑指定步骤
 *   node run.cjs --list     列出步骤
 *
 * 前置：03-源码还原/webcrack输出/app/ 已存在（webcrack 产出）
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const ROOT = path.dirname(DIR);

/**
 * 第 4 个字段 = 是否需要 webcrack 产物（03-源码还原/webcrack输出/app）。
 * 缺它时这些步骤跳过，其余照跑——原来是一缺就整体退出，等于整套工具在新仓库里不可用。
 */
const STEPS = [
  ['01-text', '01-text.cjs', '文案索引', true],
  ['02-funcs', '02-funcs.cjs', '函数切分', true],
  ['03-components', '03-components.cjs', '组件识别', true],
  ['04-spec', '04-spec.cjs', '组件规格', true],
  ['04b-methods', '04b-methods.cjs', '方法实现', true],
  ['05-flows', '05-flows.cjs', '交互链路', true],
  ['06-store', '06-store.cjs', 'store 拆解', true],
  ['07-styles', '07-styles.cjs', '样式映射', false],
  ['08-jsx', '08-jsx.cjs', 'jsx 契约', true],
  ['09-template', '09-template.cjs', '模板结构', true],
  ['10-deps', '10-deps.cjs', '依赖关系', true],
  ['11-tree', '11-tree.cjs', '组件树', true],
  ['12-dynamic', '12-dynamic.cjs', '动态逻辑', true],
  ['13-reuse', '13-reuse.cjs', '组件复用度', false],
  // 第 5 个字段 = 会覆盖已有产物：默认跳过，加 --force 才跑
  ['14-sprite', '14-sprite.cjs', '图标 sprite', false, true],
  ['15-page-spec', '15-page-spec.cjs', '页面结构 + 实测样式', false],
  ['98-audit', '98-audit.cjs', '质量审计', false],
  ['99-build-spec', '99-build-spec.cjs', '收敛总览', false],
];

const args = process.argv.slice(2);

// 前置检查：缺 webcrack 产物不退出，只跳过依赖它的步骤
const appDir = path.join(ROOT, '03-源码还原', 'webcrack输出', 'app');
const hasSrc = fs.existsSync(appDir);

if (args.includes('--list')) {
  console.log(hasSrc ? '可用步骤（输入齐全）：\n' : '可用步骤（缺 webcrack 产物，标 * 的会跳过）：\n');
  STEPS.forEach(([id, file, desc, needSrc]) => {
    const missingFile = !fs.existsSync(path.join(__dirname, file));
    const flag = missingFile ? '✗' : needSrc && !hasSrc ? '*' : ' ';
    console.log(`  ${flag} ${id.padEnd(16)}${desc}${missingFile ? '   （脚本不存在）' : ''}`);
  });
  process.exit(0);
}

const wanted = args.length ? args : null;
const run = STEPS.filter(([id]) => !wanted || wanted.some((w) => id.startsWith(w)));

console.log('=== 逆向流水线 ===');
console.log('输入: ' + (hasSrc ? appDir : '⚠ 缺 webcrack 产物，依赖它的步骤会跳过'));
console.log('步骤: ' + run.length + ' 个\n');

const t0 = Date.now();
let failed = 0;

for (const [id, file, desc, needSrc, destructive] of run) {
  const p = path.join(DIR, file);
  if (!fs.existsSync(p)) { console.log('⏭  ' + id + ' 跳过（脚本不存在）'); continue; }
  if (needSrc && !hasSrc) { console.log('⏭  ' + id + ' 跳过（缺 webcrack 产物）'); continue; }
  if (destructive && !args.includes('--force')) {
    console.log('⏭  ' + id + ' 跳过（会覆盖已有产物，加 --force 才跑）');
    continue;
  }
  process.stdout.write('▶ ' + desc + ' ... ');
  const s = Date.now();
  try {
    const out = execFileSync(process.execPath, [p], { encoding: 'utf8', timeout: 300000 });
    const ms = Date.now() - s;
    // 只取最后一行非空
    const lines = out.trim().split('\n').filter((l) => l.trim());
    console.log('✅ ' + ms + 'ms  ' + (lines[lines.length - 1] || '').slice(0, 80));
  } catch (e) {
    failed++;
    console.log('❌ ' + e.message.split('\n')[0].slice(0, 100));
  }
}

const total = ((Date.now() - t0) / 1000).toFixed(1);
console.log('\n=== 完成：' + (run.length - failed) + '/' + run.length + ' 成功，用时 ' + total + 's ===');

// 产物目录在存档里叫 reference/02-组件文档（旧名 BUILD-SPEC），两个都认
const spec = ['BUILD-SPEC', 'reference/02-组件文档']
  .map((d) => path.join(ROOT, d))
  .find((d) => fs.existsSync(d));
if (spec) {
  let files = 0, size = 0;
  const walk = (d) => {
    for (const x of fs.readdirSync(d, { withFileTypes: true })) {
      const q = path.join(d, x.name);
      if (x.isDirectory()) walk(q); else { files++; size += fs.statSync(q).size; }
    }
  };
  walk(spec);
  console.log('产出: ' + path.relative(ROOT, spec) + '/  ' + files + ' 文件  ' + (size / 1048576).toFixed(2) + 'MB');
  console.log('打开: 00-总览.md（若存在）');
}

process.exit(failed ? 1 : 0);
