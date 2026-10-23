#!/usr/bin/env node
/**
 * 08-jsx.cjs
 * jsx 调用契约：每个 PS 函数被谁调、传什么参数
 *
 * 输入：03-源码还原/组件/*.js + webcrack输出/app/*.js
 * 输出：BUILD-SPEC/06-jsx契约.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const DIRS = [
  path.join(ROOT, '03-源码还原', '组件'),
  path.join(ROOT, '03-源码还原', 'webcrack输出', 'app'),
];
const OUT = path.join(ROOT, 'BUILD-SPEC', '06-jsx契约.md');

const calls = new Map(); // funcName -> [{file, args, line}]

for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js') || f === 'deobfuscated.js') continue;
    const p = path.join(dir, f);
    let s;
    try { s = fs.readFileSync(p, 'utf8'); } catch { continue; }

    // jsx("name"... ) / jsxNoCheck("name" ...)
    const re = /jsx(?:NoCheck)?\(\s*["']([A-Za-z_$][\w$]*)["']\s*(,?)([^)]{0,200})/g;
    let m;
    while ((m = re.exec(s)) !== null) {
      const name = m[1];
      const rest = (m[3] || '').trim();
      const line = s.slice(0, m.index).split('\n').length;
      if (!calls.has(name)) calls.set(name, []);
      const list = calls.get(name);
      if (list.length < 6) list.push({ file: f, line, args: rest.slice(0, 160) });
    }
  }
}

console.log('jsx 函数 ' + calls.size + ' 个');

const md = ['# jsx 调用契约', ''];
md.push('> 来源：还原源码中所有 `jsx()` / `jsxNoCheck()` 调用');
md.push('> 用途：自建面板时，按这些形态调用原厂 jsxbin');
md.push('> 注意：函数体是 jsxbin 黑盒，此处只是**调用侧的参数形态**');
md.push('');
md.push('共 ' + calls.size + ' 个 PS 函数被调用过。');
md.push('');

for (const [name, list] of [...calls.entries()].sort()) {
  md.push('## `' + name + '`');
  md.push('');
  md.push('调用 ' + list.length + ' 处：');
  md.push('');
  for (const c of list) {
    md.push('- `' + c.file + ':' + c.line + '`' + (c.args ? '　参数：`' + c.args.replace(/\n/g, ' ').slice(0, 120) + '`' : '　无参数'));
  }
  md.push('');
}

fs.writeFileSync(OUT, md.join('\n'), 'utf8');
console.log('已生成 ' + OUT);

// 按调用次数排序打印
console.log('\n调用最多的 15 个:');
[...calls.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15)
  .forEach(([k, l]) => console.log('  ' + k.padEnd(32) + l.length + ' 处'));
