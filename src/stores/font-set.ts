// 是什么：字体面板的只读投影（设置 / 快捷字体 / 层级预设 / 当前文字属性）
// 唯一入口：页面读这三份数据只能经过这个 store
// 替代了什么：原版组件里的 `set: V.a.info`、`new lv()`、`new Ft()` 直接持有真相
// 谁在用：pages/fontSet/*
// 禁止：这里不写文件、不调 jsx；写操作在 commands/fontSet.ts

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  fontHistoryRepo,
  hierarchyRepo,
  quickFontRepo,
  translateCounterRepo,
  type HierarchyFile,
  type QuickFontFile,
  type TranslateCounter,
} from '@/cep/data/font-extra'
import {
  FONT_SET_DEFAULTS,
  readFontSetSettings,
  type FontSetSettings,
} from '@/cep/data/legacy-settings'
import { textInfoError, textInfoRef, typeUnitsRef } from '@/selection/current-text'
import { deepClone } from '@/utils/clone'

export const useFontSetStore = defineStore('fontSet', () => {
  // 深拷贝：默认值里有嵌套对象，浅拷贝会让多个 store 实例共享同一份 ztPasteFont
  const settings = ref<FontSetSettings>(deepClone(FONT_SET_DEFAULTS))
  const settingsDegraded = ref('')
  const quickFonts = ref<QuickFontFile>({ index: 0, list: [] })
  const hierarchy = ref<HierarchyFile>({ index: 0, list: [] })
  const counter = ref<TranslateCounter>({ num: 0, max: 380, time: '' })
  const recentFonts = ref<string[]>([])

  /** 当前文字属性：selection 里的唯一快照，这里只做投影 */
  const textInfo = computed(() => textInfoRef.value)
  const textError = computed(() => textInfoError.value)
  /** TypeUnits.PIXELS / POINTS / MM */
  const typeUnits = computed(() => typeUnitsRef.value)

  const activeFamily = computed(() => {
    const list = quickFonts.value.list
    const index = quickFonts.value.index
    return list[index]?.family ?? ''
  })

  async function load() {
    const [settingsRead, quickRead, hierarchyRead, counterRead, historyRead] = await Promise.all([
      readFontSetSettings(),
      quickFontRepo.read(),
      hierarchyRepo.read(),
      translateCounterRepo.read(),
      fontHistoryRepo.read(),
    ])

    settings.value = settingsRead.value
    settingsDegraded.value = settingsRead.degraded ?? ''
    quickFonts.value = quickRead.value
    hierarchy.value = hierarchyRead.value
    counter.value = counterRead.value
    recentFonts.value = historyRead.value
  }

  return {
    settings,
    settingsDegraded,
    quickFonts,
    hierarchy,
    counter,
    recentFonts,
    textInfo,
    textError,
    typeUnits,
    activeFamily,
    load,
  }
})

let bound = false

/**
 * 装配层调用一次（main.ts）：仓库写成功后刷新投影。
 * 与 `bindFontData` 同一模式，避免测试里重复订阅。
 */
export function bindFontSetData() {
  if (bound) return
  bound = true

  quickFontRepo.onChange((value) => {
    useFontSetStore().quickFonts = value
  })
  hierarchyRepo.onChange((value) => {
    useFontSetStore().hierarchy = value
  })
  translateCounterRepo.onChange((value) => {
    useFontSetStore().counter = value
  })
  fontHistoryRepo.onChange((value) => {
    useFontSetStore().recentFonts = value
  })
}
