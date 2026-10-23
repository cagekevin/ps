#!/usr/bin/env node
/**
 * 10-deps.cjs
 * 隐含依赖提取：组件之间怎么通信的
 *
 * 提取：
 *   - this.$store / $parent / $refs / $emit / $on / $root
 *   - components: {} 子组件映射
 *   - $emit 的事件名
 *   - $refs 的名字
 *
 * 输出：BUILD-SPEC/09-依赖关系.md + deps.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const COMP = path.join(ROOT, '03-源码还原', '组件');
const MAP = path.join(ROOT, '03-源码还原', 'component-map.json');
const OUT_MD = path.join(ROOT, 'BUILD-SPEC', '09-依赖关系.md');
const OUT_JSON = path.join(ROOT, 'BUILD-SPEC', '09-依赖关系.json');

const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));

function matchBrace(s, i) {
  let d = 0, quote = null, esc = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return k; }
  }
  return -1;
}

const rows = [];

for (const c of map) {
  const p = path.join(COMP, c.fileName);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8');

  // $emit 事件名
  const emits = [...new Set((s.match(/\$emit\(\s*["']([^"']+)["']/g) || [])
    .map((x) => (x.match(/["']([^"']+)["']/) || [])[1]))];

  // $refs 名字
  const refs = [...new Set((s.match(/\$refs\.([A-Za-z_$][\w$]*)/g) || [])
    .map((x) => x.replace('$refs.', '')))];

  // $parent / $root 用法
  const parents = (s.match(/\$parent/g) || []).length;
  const roots = (s.match(/\$root/g) || []).length;

  // $store 用法（state / dispatch / commit / getters）
  const storeState = [...new Set((s.match(/\$store\.state\.([A-Za-z_$][\w$]*)/g) || [])
    .map((x) => x.replace('$store.state.', '')))];
  const storeDispatch = [...new Set((s.match(/\$store\.dispatch\(\s*["']([^"']+)["']/g) || [])
    .map((x) => (x.match(/["']([^"']+)["']/) || [])[1]))];
  const storeCommit = [...new Set((s.match(/\$store\.commit\(\s*["']([^"']+)["']/g) || [])
    .map((x) => (x.match(/["']([^"']+)["']/) || [])[1]))];

  // components 子组件映射
  let subComps = [];
  const mi = s.search(/components\s*:\s*\{/);
  if (mi >= 0) {
    const b = s.indexOf('{', mi);
    const e = matchBrace(s, b);
    if (e > 0) {
      const blk = s.slice(b, e + 1);
      subComps = [...new Set((blk.match(/([A-Za-z_$][\w$]*)\s*:/g) || [])
        .map((x) => x.replace(/\s*:$/, '')))];
    }
  }

  // 事件总线（$on / $off / $bus）
  const busOn = [...new Set((s.match(/\$on\(\s*["']([^"']+)["']/g) || [])
    .map((x) => (x.match(/["']([^"']+)["']/) || [])[1]))];
  const hasBus = /\$bus|eventBus|Vue\.prototype\.\$bus/.test(s);

  const total = emits.length + refs.length + parents + roots + storeState.length
    + storeDispatch.length + storeCommit.length + subComps.length + busOn.length;
  if (total === 0) continue;

  rows.push({
    name: c.name,
    file: c.fileName,
    emits, refs, parents, roots,
    storeState, storeDispatch, storeCommit,
    subComps, busOn, hasBus,
    total,
  });
}

rows.sort((a, b) => b.total - a.total);

const md = ['# 组件依赖关系', ''];
md.push('> 目的：重写时知道每个组件**依赖什么外部东西**');
md.push('> 生成时间：' + new Date().toLocaleString('zh-CN'));
md.push('');
md.push('共 ' + rows.length + ' 个组件有外部依赖。');
md.push('');

md.push('## 依赖类型说明');
md.push('');
md.push('| 类型 | 含义 | 重写时怎么办 |');
md.push('|---|---|---|');
md.push('| `$emit` | 向父组件抛事件 | 保留事件名，父组件要监听 |');
md.push('| `$refs` | 直接操作子组件/元素 | 换成 ref 或 querySelector |');
md.push('| `$parent` | 直接访问父组件 | 改成 props / provide / store |');
md.push('| `$root` | 访问根实例 | 改成 store |');
md.push('| `$store.state` | 读全局状态 | 换成 Pinia/Vuex |');
md.push('| `$store.dispatch/commit` | 调 action/mutation | 换成 Pinia action |');
md.push('| `components` | 子组件引用 | 照搬组件结构 |');
md.push('| `$on` / `$bus` | 事件总线 | 换成 mitt 或 provide/inject |');
md.push('');

for (const r of rows) {
  md.push('## ' + r.name);
  md.push('');
  md.push('> `' + r.file + '`');
  md.push('');
  if (r.subComps.length) md.push('- **子组件**（' + r.subComps.length + '）：' + r.subComps.map((x) => '`' + x + '`').join('、'));
  if (r.emits.length) md.push('- **emit**（' + r.emits.length + '）：' + r.emits.map((x) => '`' + x + '`').join('、'));
  if (r.refs.length) md.push('- **$refs**（' + r.refs.length + '）：' + r.refs.map((x) => '`' + x + '`').join('、'));
  if (r.storeState.length) md.push('- **store.state**（' + r.storeState.length + '）：' + r.storeState.map((x) => '`' + x + '`').join('、'));
  if (r.storeDispatch.length) md.push('- **dispatch**（' + r.storeDispatch.length + '）：' + r.storeDispatch.map((x) => '`' + x + '`').join('、'));
  if (r.storeCommit.length) md.push('- **commit**（' + r.storeCommit.length + '）：' + r.storeCommit.map((x) => '`' + x + '`').join('、'));
  if (r.parents) md.push('- **$parent**：' + r.parents + ' 处');
  if (r.roots) md.push('- **$root**：' + r.roots + ' 处');
  if (r.busOn.length) md.push('- **事件总线**：' + r.busOn.map((x) => '`' + x + '`').join('、'));
  md.push('');
}

fs.writeFileSync(OUT_MD, md.join('\n'), 'utf8');
fs.writeFileSync(OUT_JSON, JSON.stringify(rows, null, 2), 'utf8');

console.log('已生成依赖关系 -> ' + OUT_MD);
console.log('组件数: ' + rows.length);

// 统计全局
const allEmits = new Set(), allStoreState = new Set(), allDispatch = new Set(), allRefs = new Set();
for (const r of rows) {
  r.emits.forEach((x) => allEmits.add(x));
  r.storeState.forEach((x) => allStoreState.add(x));
  r.storeDispatch.forEach((x) => allDispatch.add(x));
  r.refs.forEach((x) => allRefs.add(x));
}
console.log('\n=== 全局统计 ===');
console.log('  唯一 emit 事件: ' + allEmits.size);
console.log('  唯一 store.state 字段: ' + allStoreState.size);
console.log('  唯一 dispatch action: ' + allDispatch.size);
console.log('  唯一 $refs 名: ' + allRefs.size);

console.log('\n依赖最多的 10 个组件:');
rows.slice(0, 10).forEach((r) => {
  console.log('  ' + r.name.padEnd(24) + '总依赖 ' + String(r.total).padStart(3)
    + '  (子组件' + r.subComps.length + ' emit' + r.emits.length + ' refs' + r.refs.length
    + ' state' + r.storeState.length + ' dispatch' + r.storeDispatch.length + ')');
});
