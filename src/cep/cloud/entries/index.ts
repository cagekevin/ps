import type { SyncUnitAdapter } from '@/domain/cloud'
import { actionLibraryEntry } from './action-library'
import { fontHierarchyEntry } from './font-hierarchy'
import { fontSettingsEntry } from './font-settings'
import { fontStarsEntry } from './font-stars'
import { fontTagsEntry } from './font-tags'

/** 同步项；顺序不影响 hash */
export const cloudEntries: SyncUnitAdapter[] = [
  fontStarsEntry,
  fontTagsEntry,
  fontSettingsEntry,
  fontHierarchyEntry,
  actionLibraryEntry,
]
