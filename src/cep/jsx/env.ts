import { jsxWrite } from '@/cep/transport'
import { WRITE } from './timeouts'
import type { EnvJsx } from './types'

/** 环境变量注入。不注入的话 jsx 内部拼路径会报「undefined 不是对象」 */
export function createEnvJsx(): EnvJsx {
  return {
    setEnv: (json) =>
      jsxWrite('Sys_setSystemEnvInfo', [json], {
        label: '注入环境变量',
        timeout: WRITE,
      }),
  }
}
