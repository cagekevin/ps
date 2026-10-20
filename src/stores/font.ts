import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createFontTag,
  deleteFontTag,
  getFontStars,
  getFontTags,
  renameFontTag,
  setFont,
  setFontStar,
  toggleFontTag,
} from '@/cep/ps'
import { describeCepError } from '@/cep/eval-script'
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
 * 字体相关的跨页面状态。
 * 列表数据不在这里 —— 列表归页面自己的 useListPage 管，
 * store 只放"多个页面都要用"的东西（标签、预览档位、最近应用）。
 */
export const useFontStore = defineStore('font', () => {
  const tags = ref<FontTag[]>([])
  const tagsError = ref('')
  const stars = ref<Record<string, number>>({})
  const activeFamily = ref('')
  const previewMode = usePersistedRef<PreviewMode>('font.previewMode', 'small')
  /** 用户自定义的预览文案；空字符串表示用默认（按语言自动选） */
  const customPreviewText = usePersistedRef<string>('font.previewText', '')

  async function loadStars() {
    try {
      stars.value = await getFontStars()
    } catch {
      stars.value = {}
    }
  }

  /** 点同一颗星 = 取消收藏 */
  async function rate(family: string, value: number) {
    const next = stars.value[family] === value ? 0 : value
    const copy = { ...stars.value }
    if (next <= 0) delete copy[family]
    else copy[family] = next
    stars.value = copy

    try {
      await setFontStar(family, next)
    } catch (e) {
      tagsError.value = describeCepError(e)
    }
  }

  /** 新建 / 重命名 / 删除标签，成功返回 null，失败返回文案 */
  async function createTag(text: string): Promise<string | null> {
    try {
      await createFontTag(text)
      tags.value = await getFontTags()
      return null
    } catch (e) {
      return describeCepError(e)
    }
  }

  async function renameTag(from: string, to: string): Promise<string | null> {
    try {
      await renameFontTag(from, to)
      tags.value = await getFontTags()
      return null
    } catch (e) {
      return describeCepError(e)
    }
  }

  async function deleteTag(text: string): Promise<string | null> {
    try {
      await deleteFontTag(text)
      tags.value = await getFontTags()
      return null
    } catch (e) {
      return describeCepError(e)
    }
  }

  async function toggleTag(tagText: string, family: string) {
    try {
      await toggleFontTag(tagText, family)
      tags.value = await getFontTags()
    } catch (e) {
      tagsError.value = describeCepError(e)
    }
  }

  async function loadTags() {
    if (tags.value.length) return
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

  /** 成功返回 null，失败返回可展示文案 */
  async function apply(font: FontItem, variantIndex = 0): Promise<string | null> {
    try {
      await setFont(font, variantIndex)
      activeFamily.value = font.family
      return null
    } catch (e) {
      return describeCepError(e)
    }
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
    rate,
    toggleTag,
    createTag,
    renameTag,
    deleteTag,
    cyclePreview,
    apply,
  }
})
