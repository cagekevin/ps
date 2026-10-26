import { exposeBuildInfo, getBridge } from '@/cep/host'
import { log } from '@/utils/logger'

/** 构建信息：版本号来自 package.json，时间来自 vite define */
export interface BuildInfo {
  version: string
  time: string
}

export const BUILD_INFO: BuildInfo = {
  version: __APP_VERSION__,
  time: __BUILD_TIME__,
}

/**
 * 启动自检：
 * - 把版本/构建时间写到 DOM 和 window，排查“改了没生效”时不用猜；
 * - 只告警，不阻断启动；
 * - 不读业务数据，不依赖 Pinia。
 */
export function installStartupCheck(): BuildInfo {
  const data = document.documentElement.dataset
  data.appVersion = BUILD_INFO.version
  data.buildTime = BUILD_INFO.time
  exposeBuildInfo(BUILD_INFO)

  log.info('build', `版本 ${BUILD_INFO.version} · ${BUILD_INFO.time}`)

  const cep = getBridge()
  if (!cep) {
    log.warn('build', '启动自检：当前不是 CEP 环境（浏览器调试）')
    return BUILD_INFO
  }

  try {
    const id = cep.getExtensionId()
    if (!id) log.warn('build', '启动自检：CEP 扩展 ID 为空')
  } catch (error) {
    log.warn('build', '启动自检：读取 CEP 扩展 ID 失败', error)
  }

  return BUILD_INFO
}
