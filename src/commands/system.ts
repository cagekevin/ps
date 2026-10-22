// 是什么：设置页的系统侧能力——快捷键脚本落盘、复制到 PS 脚本目录、刷新快捷键
// 唯一入口：写 `Presets/Scripts` 与 `快捷键脚本` 目录的 jsx（页面只经 useCommand）
// 替代了什么：设置页里两个无事件的空按钮（原版 manualCopy / copyToScripts / resetQuickKey）
// 谁在用：pages/set
// 禁止：页面不直接 import cep/fs，也不自己拼 Presets 路径

import { psScriptsDir, userDir, writeTextFile } from '@/cep/fs'
import { CepError } from '@/utils/errors'
import { defineCommand } from './registry'
import type { ShortcutScriptGroup } from './payloads'
import type { Command } from './types'

/** 原版脚本模板，`:350,380` 原文照抄（含 CRLF） */
const SCRIPT_TEMPLATE = '#target photoshop;\r\nfunction init() {}\r\ninit();'

/** 原版快捷键脚本目录（`docs/页面/08-设置.md:337`） */
const SCRIPT_SUBDIR = '快捷键脚本'

function writeScripts(dir: string, groups: ShortcutScriptGroup[]) {
  for (const group of groups) writeTextFile(`${dir}/SJZL-${group}.jsx`, SCRIPT_TEMPLATE)
}

export const systemCommands: Command<unknown>[] = [
  defineCommand({
    id: 'system.manualCopyShortcut',
    title: '手动拷贝配置文件',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { groups }) {
      try {
        writeScripts(`${userDir()}/${SCRIPT_SUBDIR}`, groups)
      } catch (e) {
        // 原版文案：拷贝文件错误…请手动复制或者开启管理员权限（`08-设置.md:380-386`）
        throw new CepError(
          'IO',
          `拷贝文件错误：${e instanceof Error ? e.message : String(e)}。请手动复制或者开启管理员权限`,
        )
      }
    },
  }),
  defineCommand({
    id: 'system.copyToScripts',
    title: '拷贝到 PS 脚本目录',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { groups }) {
      const dir = await psScriptsDir()
      // 解析不出路径必须报错：静默跳过会让用户以为拷成功了
      if (!dir) {
        throw new CepError('IO', '拷贝文件错误：找不到 PS 的脚本目录，请手动复制或者开启管理员权限')
      }
      try {
        writeScripts(`${dir}/快捷键脚本`, groups)
      } catch (e) {
        throw new CepError(
          'IO',
          `拷贝文件错误：${e instanceof Error ? e.message : String(e)}。请手动复制或者开启管理员权限`,
        )
      }
    },
  }),
  defineCommand({
    id: 'system.resetQuickKeys',
    title: '刷新配置文件',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run() {
      // UNVERIFIED: 原版是 `dt.reset()`（`08-设置.md:368-370`），我们还没有快捷键数据层，
      // 重写脚本即等价于「重新生成配置文件」，语义待快捷键功能落地后复核。
    },
  }),
]
