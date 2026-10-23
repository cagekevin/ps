const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const path = require('path');

const ENC = path.join(process.env.APPDATA, 'fz.FengZi1Hao', 'js', 'all.c0Z3r02y.js');
const OUT = 'C:\\Users\\Public\\all.decrypted.js';

const KEY = Buffer.from('c85d871e5a984545c63b49130f287211', 'hex');
const IV = Buffer.from('8b8f6daa15ec3ae26b41c896f7c5aa10', 'hex');

const text = fs.readFileSync(ENC, 'utf8').trim();
const cipher = Buffer.from(text, 'base64');
const d = crypto.createDecipheriv('aes-128-cbc', KEY, IV);
let out = Buffer.concat([d.update(cipher), d.final()]);

console.log('AES 解密后 ' + out.length + ' 字节');
console.log('前 4 字节: ' + out.slice(0, 4).toString('hex'));

// 判断是否有 gzip 头
if (out[0] === 0x1f && out[1] === 0x8b) {
  console.log('检测到 gzip，解压...');
  out = zlib.gunzipSync(out);
  console.log('解压后 ' + out.length + ' 字节');
}

let js = out.toString('utf8');
console.log('\n=== 前 400 字符 ===');
console.log(js.slice(0, 400));

// 如果还是 base64，再解一层
if (/^[A-Za-z0-9+/=\s]{500,}$/.test(js.slice(0, 500))) {
  console.log('\n看起来还是 base64，再解一层...');
  const b2 = Buffer.from(js, 'base64');
  console.log('解码后 ' + b2.length + ' 字节，前 4: ' + b2.slice(0, 4).toString('hex'));
  if (b2[0] === 0x1f && b2[1] === 0x8b) {
    js = zlib.gunzipSync(b2).toString('utf8');
  } else {
    js = b2.toString('utf8');
  }
}

fs.writeFileSync(OUT, js, 'utf8');
console.log('\n✅ 已保存 ' + OUT + '  (' + (js.length / 1024).toFixed(0) + 'KB)');

console.log('\n=== 关键函数检查 ===');
for (const fn of ['ztgl_initSystemList', 'ztgl_setFont', 'zt_setFontColor', 'overprint_getAllLayers', 'Fs_selectFolder', 'function']) {
  console.log('  ' + fn.padEnd(28) + js.includes(fn));
}
