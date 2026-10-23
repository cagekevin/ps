#!/usr/bin/env node
/**
 * 面板调试 · 极简版本回退
 *
 *   node 版本.js save "说明"     把当前 3 个关键文件存一版
 *   node 版本.js list            列出所有版本
 *   node 版本.js restore 3       还原到第 3 版（还原前自动存当前状态）
 *
 * 只管 3 个文件，不管注册表、不做哈希对比。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BASE = 'D:\\稿定设计助理-存档';
const HIST = path.join(BASE, '02-版本历史');
const APPDATA = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');

const FILES = [
  { key: 'ext-index', label: '扩展入口', src: path.join(APPDATA, 'Adobe', 'CEP', 'extensions', 'com.sf.设计助理2.7', 'index.html'), name: 'ext-index.html' },
  { key: 'panel-index', label: '面板入口', src: path.join(APPDATA, 'fz.FengZi1Hao', 'index.html'), name: 'panel-index.html' },
  { key: 'panel-bundle', label: '面板逻辑', src: findBundle(), name: 'app.js' },
];

function findBundle() {
  const jsDir = path.join(APPDATA, 'fz.FengZi1Hao', 'js');
  if (!fs.existsSync(jsDir)) return path.join(jsDir, 'app.js');
  const hit = fs.readdirSync(jsDir).find((n) => /^app\.[0-9a-f]+\.js$/i.test(n));
  return hit ? path.join(jsDir, hit) : path.join(jsDir, 'app.js');
}

function versions() {
  if (!fs.existsSync(HIST)) return [];
  return fs.readdirSync(HIST).filter((d) => fs.existsSync(path.join(HIST, d, 'info.json'))).sort();
}

function save(label) {
  if (!fs.existsSync(HIST)) fs.mkdirSync(HIST, { recursive: true });
  const dirs = versions();
  const n = dirs.length + 1;
  const dir = path.join(HIST, String(n).padStart(3, '0'));
  fs.mkdirSync(dir, { recursive: true });

  const info = { no: n, label: label || '', time: new Date().toLocaleString('zh-CN'), files: [] };
  for (const f of FILES) {
    const dst = path.join(dir, f.name);
    if (fs.existsSync(f.src)) {
      fs.copyFileSync(f.src, dst);
      info.files.push({ key: f.key, label: f.label, src: f.src, size: fs.statSync(f.src).size, saved: true });
      console.log('  [已存] ' + f.label + '  ' + (fs.statSync(f.src).size / 1024).toFixed(0) + 'KB');
    } else {
      info.files.push({ key: f.key, label: f.label, src: f.src, saved: false });
      console.log('  [缺失] ' + f.label);
    }
  }
  fs.writeFileSync(path.join(dir, 'info.json'), JSON.stringify(info, null, 2), 'utf8');
  console.log('\n已存为第 ' + n + ' 版：' + (label || ''));
  return n;
}

function list() {
  const dirs = versions();
  if (!dirs.length) return console.log('还没有任何版本记录。先执行 save。');
  console.log('共 ' + dirs.length + ' 版：\n');
  for (const d of dirs) {
    const i = JSON.parse(fs.readFileSync(path.join(HIST, d, 'info.json'), 'utf8'));
    const size = i.files.reduce((s, f) => s + (f.size || 0), 0);
    console.log('  ' + d + '  ' + i.time + '  ' + (size / 1048576).toFixed(1) + 'MB  ' + (i.label || ''));
  }
}

function restore(no) {
  const dirs = versions();
  const target = dirs.find((d) => d === no || Number(d) === Number(no));
  if (!target) throw new Error('找不到第 ' + no + ' 版');
  const i = JSON.parse(fs.readFileSync(path.join(HIST, target, 'info.json'), 'utf8'));

  console.log('先保存当前状态...');
  save('还原前自动备份');
  console.log('\n还原到第 ' + i.no + ' 版（' + i.time + ' ' + (i.label || '') + '）');

  for (const f of i.files) {
    if (!f.saved) { console.log('  [跳过] ' + f.label + '（当时不存在）'); continue; }
    const src = path.join(HIST, target, FILES.find((x) => x.key === f.key).name);
    if (!fs.existsSync(src)) { console.log('  [缺失] ' + f.label); continue; }
    fs.mkdirSync(path.dirname(f.src), { recursive: true });
    fs.copyFileSync(src, f.src);
    console.log('  [已还原] ' + f.label);
  }
  console.log('\n完成。请完全退出 Photoshop 后重新打开。');
}

const [cmd, arg] = process.argv.slice(2);
console.log('');
try {
  if (cmd === 'save') save(arg || '未命名');
  else if (cmd === 'list') list();
  else if (cmd === 'restore') restore(arg);
  else {
    console.log('用法：');
    console.log('  node 版本.js save "说明"');
    console.log('  node 版本.js list');
    console.log('  node 版本.js restore <编号>');
  }
} catch (e) {
  console.error('出错: ' + e.message);
  process.exit(1);
}
