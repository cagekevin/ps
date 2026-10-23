#!/usr/bin/env node
/**
 * 稿定设计助理 · 登录态修复
 *
 * 症状：面板提示"登录成功，正在加载"，加载完又回到登录页。
 * 原因：UMS 已不再下发 refresh_token，但面板校验要求
 *       access_token && refresh_token 同时存在。
 *
 * 用法：双击「修复登录态.cmd」，或 node 修复登录态.js
 * 前提：先在面板里正常登录一次，让 token 文件生成。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY = Buffer.from('1234123412ABCDEF', 'utf8');
const IV = Buffer.from('ABCDEF1234123412', 'utf8');
const USERDIR = path.join(process.env.APPDATA || '', 'SheJiZhuLi');

const CANDIDATES = ['LmjcuscH3U.ini']; // CEP001 的 token 文件名（面板代码里写死）

function dec(hex) {
  const d = crypto.createDecipheriv('aes-128-cbc', KEY, IV);
  return Buffer.concat([d.update(Buffer.from(hex, 'hex')), d.final()]).toString('utf8');
}

function enc(text) {
  const c = crypto.createCipheriv('aes-128-cbc', KEY, IV);
  return Buffer.concat([c.update(Buffer.from(text, 'utf8')), c.final()]).toString('hex').toUpperCase();
}

function looksLikeToken(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!/^[0-9a-fA-F]+$/.test(raw) || raw.length % 32 !== 0) return null;
    const obj = JSON.parse(dec(raw));
    return obj && obj.access_token ? { raw, obj } : null;
  } catch {
    return null;
  }
}

function main() {
  console.log('');
  console.log('稿定设计助理 · 登录态修复');
  console.log('');

  if (!fs.existsSync(USERDIR)) {
    console.log('找不到目录: ' + USERDIR);
    console.log('请先打开 Photoshop 里的插件，正常登录一次。');
    return;
  }

  // 先试约定文件名，再扫描整个目录
  let target = null, data = null;
  for (const name of CANDIDATES) {
    const p = path.join(USERDIR, name);
    if (fs.existsSync(p)) {
      const hit = looksLikeToken(p);
      if (hit) { target = p; data = hit; break; }
    }
  }
  if (!target) {
    for (const f of fs.readdirSync(USERDIR)) {
      const p = path.join(USERDIR, f);
      if (!fs.statSync(p).isFile() || f.endsWith('.bak')) continue;
      const hit = looksLikeToken(p);
      if (hit) { target = p; data = hit; break; }
    }
  }

  if (!target) {
    console.log('没有找到有效的 token 文件。');
    console.log('说明还没登录成功，或登录态已被清空。');
    console.log('请先在面板里登录一次，成功后再运行本工具。');
    return;
  }

  console.log('token 文件: ' + target);
  console.log('字段: ' + Object.keys(data.obj).join(', '));

  if (data.obj.refresh_token) {
    console.log('');
    console.log('refresh_token 已存在，无需修复。');
    return;
  }

  fs.writeFileSync(target + '.bak', data.raw, 'utf8');
  console.log('已备份 -> ' + target + '.bak');

  data.obj.refresh_token = data.obj.access_token;
  data.obj.refresh_token_expires_at = data.obj.access_token_expires_at || data.obj.refresh_token_expires_at;

  const out = enc(JSON.stringify(data.obj));
  fs.writeFileSync(target, out, 'utf8');

  const check = JSON.parse(dec(fs.readFileSync(target, 'utf8').trim()));
  console.log('已补 refresh_token，回读校验通过: ' + (!!check.access_token && !!check.refresh_token));
  console.log('');
  console.log('现在关闭插件面板再重新打开即可。');
}

try {
  main();
} catch (e) {
  console.error('出错: ' + e.message);
}
console.log('');
