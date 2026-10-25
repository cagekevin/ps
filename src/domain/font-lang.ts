// 是什么：字体家族名 → 中/英 的**唯一判据**（原版 `app.v4.js:47561` 的 `Ax` 正则）
// 唯一入口：凡"这个字体算中文还是英文 / 预览该用哪句话 / 字重预览该用哪个字"，都从这里拿
// 替代了什么：三份各写一遍的判定——stores/font.ts 的 familyLang、font-filter.ts 的
//             `[\u4e00-\u9fa5]`、FontWeight.vue 的 isAscii（前两份规则还不一样）
// 谁在用：stores/font.ts（预览文案）、domain/font-filter.ts（语言筛选）、
//         pages/fontManage/components/FontWeight.vue（字重预览用「A」还是「永」）
// 禁止：别处再写这串正则；这条规则一改，三个消费点同时变

/**
 * 家族名只由 ASCII 字符集构成 ⇒ 英文命名（原版 `jx()`，`app.v4.js:47561-47568`）。
 *
 * 正则里那串字符是原版的**字面集合**（含空格、点、连字符、下划线、问号），
 * 不是"任何非中文"。所以日文假名、全角符号、`°` 都落在"非英文"一侧——
 * 与"名字里有没有汉字"是两个不同的问题，不能拿 `[\u4e00-\u9fa5]` 代替（那正是 根因：
 * `°` 被判成"英文预览 + 中文筛选"，同一字体两种答案）。
 */
const ASCII_FAMILY = /^[a-zA-Z0-9. -_?]*$/

export function isAsciiFamily(family: string): boolean {
  return ASCII_FAMILY.test(family)
}

/** 预览/筛选用的二分：`en` = 英文命名，`cn` = 其余（原版只有这两种结论） */
export function familyLang(family: string): 'en' | 'cn' {
  return isAsciiFamily(family) ? 'en' : 'cn'
}
