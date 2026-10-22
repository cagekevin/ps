// 是什么：MD5（翻译接口签名用）
// 唯一入口：全项目只在这里实现 MD5；不要在别处再拷一份
// 替代了什么：原版 app.v4.js:42564 `Nv()`（翻译签名用的那段 MD5）
// 谁在用：domain/translate.ts
// 禁止：用于密码/安全场景——这里只为兼容第三方签名算法

/**
 * 32 位加法，结果按无符号处理。
 * 原版用 `n()` 手工处理符号位（:42568-42590），效果与 `>>> 0` 相同。
 */
function add32(a: number, b: number): number {
  return (a + b) >>> 0
}

function rol(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0
}

function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return add32(rol(add32(add32(a, (b & c) | (~b & d)), add32(x, t)), s), b)
}

function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return add32(rol(add32(add32(a, (b & d) | (c & ~d)), add32(x, t)), s), b)
}

function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return add32(rol(add32(add32(a, b ^ c ^ d), add32(x, t)), s), b)
}

function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return add32(rol(add32(add32(a, c ^ (b | ~d)), add32(x, t)), s), b)
}

/** UTF-8 编码后再按 4 字节小端打包；原版 `f()` + `h()`（:42619-42653） */
function toWords(input: string): number[] {
  const utf8: number[] = []
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i)

    // 代理对必须合成一个 4 字节码点，否则签名与服务器算出来的不一致（表情符号）
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000
        i++
      }
    }

    if (code < 0x80) {
      utf8.push(code)
    } else if (code < 0x800) {
      utf8.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      utf8.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      utf8.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }

  const bitLength = utf8.length * 8
  utf8.push(0x80)
  while (utf8.length % 64 !== 56) utf8.push(0)

  const words: number[] = []
  for (let i = 0; i < utf8.length; i += 4) {
    words.push((utf8[i] | (utf8[i + 1] << 8) | (utf8[i + 2] << 16) | (utf8[i + 3] << 24)) >>> 0)
  }
  words.push(bitLength >>> 0, Math.floor(bitLength / 0x100000000) >>> 0)
  return words
}

function toHex(value: number): string {
  let out = ''
  for (let i = 0; i <= 3; i++) {
    out += `0${((value >>> (i * 8)) & 0xff).toString(16)}`.slice(-2)
  }
  return out
}

export function md5(input: string): string {
  const words = toWords(input)
  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476

  for (let i = 0; i < words.length; i += 16) {
    const oa = a
    const ob = b
    const oc = c
    const od = d

    a = ff(a, b, c, d, words[i], 7, 0xd76aa478)
    d = ff(d, a, b, c, words[i + 1], 12, 0xe8c7b756)
    c = ff(c, d, a, b, words[i + 2], 17, 0x242070db)
    b = ff(b, c, d, a, words[i + 3], 22, 0xc1bdceee)
    a = ff(a, b, c, d, words[i + 4], 7, 0xf57c0faf)
    d = ff(d, a, b, c, words[i + 5], 12, 0x4787c62a)
    c = ff(c, d, a, b, words[i + 6], 17, 0xa8304613)
    b = ff(b, c, d, a, words[i + 7], 22, 0xfd469501)
    a = ff(a, b, c, d, words[i + 8], 7, 0x698098d8)
    d = ff(d, a, b, c, words[i + 9], 12, 0x8b44f7af)
    c = ff(c, d, a, b, words[i + 10], 17, 0xffff5bb1)
    b = ff(b, c, d, a, words[i + 11], 22, 0x895cd7be)
    a = ff(a, b, c, d, words[i + 12], 7, 0x6b901122)
    d = ff(d, a, b, c, words[i + 13], 12, 0xfd987193)
    c = ff(c, d, a, b, words[i + 14], 17, 0xa679438e)
    b = ff(b, c, d, a, words[i + 15], 22, 0x49b40821)

    a = gg(a, b, c, d, words[i + 1], 5, 0xf61e2562)
    d = gg(d, a, b, c, words[i + 6], 9, 0xc040b340)
    c = gg(c, d, a, b, words[i + 11], 14, 0x265e5a51)
    b = gg(b, c, d, a, words[i], 20, 0xe9b6c7aa)
    a = gg(a, b, c, d, words[i + 5], 5, 0xd62f105d)
    d = gg(d, a, b, c, words[i + 10], 9, 0x02441453)
    c = gg(c, d, a, b, words[i + 15], 14, 0xd8a1e681)
    b = gg(b, c, d, a, words[i + 4], 20, 0xe7d3fbc8)
    a = gg(a, b, c, d, words[i + 9], 5, 0x21e1cde6)
    d = gg(d, a, b, c, words[i + 14], 9, 0xc33707d6)
    c = gg(c, d, a, b, words[i + 3], 14, 0xf4d50d87)
    b = gg(b, c, d, a, words[i + 8], 20, 0x455a14ed)
    a = gg(a, b, c, d, words[i + 13], 5, 0xa9e3e905)
    d = gg(d, a, b, c, words[i + 2], 9, 0xfcefa3f8)
    c = gg(c, d, a, b, words[i + 7], 14, 0x676f02d9)
    b = gg(b, c, d, a, words[i + 12], 20, 0x8d2a4c8a)

    a = hh(a, b, c, d, words[i + 5], 4, 0xfffa3942)
    d = hh(d, a, b, c, words[i + 8], 11, 0x8771f681)
    c = hh(c, d, a, b, words[i + 11], 16, 0x6d9d6122)
    b = hh(b, c, d, a, words[i + 14], 23, 0xfde5380c)
    a = hh(a, b, c, d, words[i + 1], 4, 0xa4beea44)
    d = hh(d, a, b, c, words[i + 4], 11, 0x4bdecfa9)
    c = hh(c, d, a, b, words[i + 7], 16, 0xf6bb4b60)
    b = hh(b, c, d, a, words[i + 10], 23, 0xbebfbc70)
    a = hh(a, b, c, d, words[i + 13], 4, 0x289b7ec6)
    d = hh(d, a, b, c, words[i], 11, 0xeaa127fa)
    c = hh(c, d, a, b, words[i + 3], 16, 0xd4ef3085)
    b = hh(b, c, d, a, words[i + 6], 23, 0x04881d05)
    a = hh(a, b, c, d, words[i + 9], 4, 0xd9d4d039)
    d = hh(d, a, b, c, words[i + 12], 11, 0xe6db99e5)
    c = hh(c, d, a, b, words[i + 15], 16, 0x1fa27cf8)
    b = hh(b, c, d, a, words[i + 2], 23, 0xc4ac5665)

    a = ii(a, b, c, d, words[i], 6, 0xf4292244)
    d = ii(d, a, b, c, words[i + 7], 10, 0x432aff97)
    c = ii(c, d, a, b, words[i + 14], 15, 0xab9423a7)
    b = ii(b, c, d, a, words[i + 5], 21, 0xfc93a039)
    a = ii(a, b, c, d, words[i + 12], 6, 0x655b59c3)
    d = ii(d, a, b, c, words[i + 3], 10, 0x8f0ccc92)
    c = ii(c, d, a, b, words[i + 10], 15, 0xffeff47d)
    b = ii(b, c, d, a, words[i + 1], 21, 0x85845dd1)
    a = ii(a, b, c, d, words[i + 8], 6, 0x6fa87e4f)
    d = ii(d, a, b, c, words[i + 15], 10, 0xfe2ce6e0)
    c = ii(c, d, a, b, words[i + 6], 15, 0xa3014314)
    b = ii(b, c, d, a, words[i + 13], 21, 0x4e0811a1)
    a = ii(a, b, c, d, words[i + 4], 6, 0xf7537e82)
    d = ii(d, a, b, c, words[i + 11], 10, 0xbd3af235)
    c = ii(c, d, a, b, words[i + 2], 15, 0x2ad7d2bb)
    b = ii(b, c, d, a, words[i + 9], 21, 0xeb86d391)

    a = add32(a, oa)
    b = add32(b, ob)
    c = add32(c, oc)
    d = add32(d, od)
  }

  return (toHex(a) + toHex(b) + toHex(c) + toHex(d)).toLowerCase()
}
