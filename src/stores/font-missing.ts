// 是什么：缺字体提示的**响应式状态**（哪个字体缺、弹窗开关）
// 唯一入口：命令经 `commands/runtime.ts` 的端口置位；页面经 `useFontMissingStore()` 读/清
// 替代了什么：`domain/font-missing.ts` 里那个 `ref`（domain 零框架，L5）
// 谁在用：pages/fontSet/index.vue（弹窗）、commands/fontSet.ts（经端口）
// 禁止：domain 里不要再放响应式状态；这里不读文件、不发请求

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFontMissingStore = defineStore('font-missing', () => {
  /** 缺哪个字体；null = 没有缺失提示要显示 */
  const missingFont = ref<string | null>(null)

  /** 命令层置位：只记名字，弹窗由页面用 CepModal 展示（原版 app.v4.js:43518-43525） */
  function signal(name: string): void {
    missingFont.value = name
  }

  function clear(): void {
    missingFont.value = null
  }

  return { missingFont, signal, clear }
})
