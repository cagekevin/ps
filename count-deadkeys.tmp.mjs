// 找 msg.* 里「表里有、代码不用」的死键。只读。用完即删。
import { readFileSync } from 'node:fs'

const msgSrc = readFileSync('src/domain/messages.ts', 'utf8')
const files = readFileSync('srclist.txt', 'utf8').split(/\r?\n/).filter(Boolean)
let blob = ''
for (const f of files) blob += readFileSync(f, 'utf8') + '\n'

const body = msgSrc.slice(msgSrc.indexOf('export const msg: Msg ='))
const nsRe = /^  ([a-zA-Z]+): \{/gm
let ns
const namespaces = []
while ((ns = nsRe.exec(body))) namespaces.push({ name: ns[1], start: ns.index })

const dead = []
let total = 0
for (let i = 0; i < namespaces.length; i++) {
  const seg = body.slice(namespaces[i].start, i + 1 < namespaces.length ? namespaces[i + 1].start : body.length)
  const sub = /\n    (text|fn): \{/g
  let s
  const subs = []
  while ((s = sub.exec(seg))) subs.push({ name: s[1], start: s.index })
  for (let j = 0; j < subs.length; j++) {
    const sseg = seg.slice(subs[j].start, j + 1 < subs.length ? subs[j + 1].start : seg.length)
    const keyRe = /^      ([a-zA-Z][a-zA-Z0-9_]*):/gm
    let k
    while ((k = keyRe.exec(sseg))) {
      total++
      const full = `${namespaces[i].name}.${subs[j].name}.${k[1]}`
      if (!blob.includes(full)) dead.push(full)
    }
  }
}
console.log('TOTAL_KEYS_DECLARED', total)
console.log('DEAD_KEYS', dead.length)
for (const d of dead) console.log('  ' + d)
