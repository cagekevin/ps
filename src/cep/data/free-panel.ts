import { DATA_FILES } from '@/cep/env'
import { userDir } from '@/cep/fs'
import { createEmptyFreePanel, type FreePanelFile } from '@/domain/free-panel'
import { pick } from './pick'
import type { Repo } from './types'

/**
 * 自由面板数据仓库。
 *
 * 文件：`<userDir>/sj_appFreePanel.json`
 * 真实结构：`{ uid, btnId, obj:{version,type,list:Block[]} }`
 *
 * 不扁平化，不重排 block；页面只消费 store 投影。
 */
export const freePanelRepo: Repo<FreePanelFile> = pick(
  () => `${userDir()}/${DATA_FILES.appFreePanel}`,
  createEmptyFreePanel,
  createEmptyFreePanel,
)
