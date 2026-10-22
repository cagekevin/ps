import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getFontList, getFontStars, getFontTags } from '@/cep/ps'
import { starsRepo, tagsRepo } from '@/cep/data'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'
import { usePersistedRef } from '@/composables/usePersisted'
import type { FontItem, FontTag } from '@/cep/types'

/** 预览档位，对齐原面板的 xg 数组 */
export type PreviewMode = 'none' | 'small' | 'medium' | 'large' | 'extra-large'

export const PREVIEW_MODES: PreviewMode[] = ['none', 'small', 'medium', 'large', 'extra-large']

export const PREVIEW_LABEL: Record<PreviewMode, string> = {
  none: '普通列表',
  small: '小预览',
  medium: '中预览',
  large: '大预览',
  'extra-large': '超大预览',
}

/** 原面板的判定：家族名是纯 ASCII 就当英文，否则中文 */
export function familyLang(family: string): 'en' | 'cn' {
  return /^[a-zA-Z0-9. -_?]*$/.test(family) ? 'en' : 'cn'
}

export function previewText(family: string): string {
  return familyLang(family) === 'en' ? 'Crazy Design' : '设计助理'
}

/**
 * 字体相关的跨页面**只读投影**。
 *
 * 写操作全部在 `commands/font.ts`（ADR-16）。这里只负责：
 * 读一次、缓存、订阅仓库变更后刷新。
 * 列表数据不在这里 —— 列表归页面自己的 `usePagedList`。
 */
export const useFontStore = defineStore('font', () => {
  const tags = ref<FontTag[]>([])
  const tagsError = ref('')
  const stars = ref<Record<string, number>>({})
  /** 最近一次成功应用的家族，仅用于列表高亮（页面写，不算业务真相） */
  const activeFamily = ref('')
  const previewMode = usePersistedRef<PreviewMode>('font.previewMode', 'small')
  /** 用户自定义的预览文案；空字符串表示用默认（按语言自动选） */
  const customPreviewText = usePersistedRef<string>('font.previewText', '')

  /**
   * 字体列表读取入口。
   *
   * 放 store 而不是让页面 import `cep/ps`：页面只有"读模型"和"命令"两条通道，
   * 这样"页面不碰 cep"是结构事实，不靠 eslint 拦（上一轮就是页面在 ps.ts 上开了口子）。
   */
  async function fetchList(opts: { refresh?: boolean } = {}): Promise<FontItem[]> {
    return getFontList(opts)
  }

  async function loadStars() {
    try {
      stars.value = await getFontStars()
    } catch (e) {
      stars.value = {}
      log.warn('font', '星级读取失败，按全未收藏处理', e)
    }
  }

  /** force 用于仓库变更后的强制刷新；普通调用命中缓存就返回 */
  async function loadTags(force = false) {
    if (!force && tags.value.length) return
    tagsError.value = ''
    try {
      tags.value = await getFontTags()
    } catch (e) {
      tagsError.value = describeCepError(e)
    }
  }

  function cyclePreview() {
    const index = PREVIEW_MODES.indexOf(previewMode.value)
    previewMode.value = PREVIEW_MODES[(index + 1) % PREVIEW_MODES.length]
  }

  return {
    tags,
    tagsError,
    stars,
    activeFamily,
    previewMode,
    customPreviewText,
    loadTags,
    loadStars,
    fetchList,
    cyclePreview,
  }
})

let bound = false

/**
 * 装配层调用一次（main.ts）：命令写成功后刷新只读投影。
 *
 * 不放在 store setup 里，是因为测试每次 createPinia 都会新建 store，
 * 订阅会累积到已销毁的实例上。
 */
export function bindFontData() {
  if (bound) return
  bound = true

  tagsRepo.onChange(() => {
    void useFontStore().loadTags(true)
  })
  starsRepo.onChange(() => {
    void useFontStore().loadStars()
  })
}
