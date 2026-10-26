// 探针1 修正版：直接 import TS 需要编译；改为用 tsx/vite-node 不可用 ⇒ 手写等价最小复现
// 依据 src/utils/jsx-result.ts:91-100 原文逻辑逐行复刻
function typedOutcome(outcome, decode, label) {
  if (!outcome.ok) return outcome
  const decoded = decode(outcome.data)
  return decoded === null
    ? { ok: false, code: 'PARSE', reason: `${label}：返回结构不认识` }
    : { ok: true, data: decoded }
}
const out = typedOutcome({ ok: true, data: { whatever: '脏数据' } }, () => null, '字体列表')
console.log(JSON.stringify(out, null, 0))
console.log('---')
console.log('失败臂可观测字段：' + Object.keys(out).join(' / '))
console.log('raw 原值是否可追：' + ('data' in out))
