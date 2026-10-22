import { actionCommands } from './action'
import { cloudCommands } from './cloud'
import { fontCommands } from './font'
import { fontSetCommands } from './fontSet'
import { freePanelCommands } from './freePanel'
import { legacyCommands } from './legacy'
import { renameCommands } from './rename'
import { register } from './registry'
import { styleCommands } from './style'

/**
 * 聚合注册。全项目唯一的注册点。
 *
 * 新增命令**只改域文件**（`commands/font.ts` 等），不在这里逐条 import——
 * 否则"新增一条命令只改一个文件"这条判据不成立。
 */
for (const command of [
  ...fontCommands,
  ...fontSetCommands,
  ...actionCommands,
  ...freePanelCommands,
  ...legacyCommands,
  ...cloudCommands,
  ...renameCommands,
  ...styleCommands,
])
  register(command)

export * from './registry'
export * from './types'
export type { CommandId, CommandPayloads } from './payloads'
export type {
  ApplyFontPayload,
  RatePayload,
  TagTextPayload,
  RenameTagPayload,
  ToggleTagPayload,
} from './payloads'
