/**
 * 开发模式准备：把扩展目录指向 localhost:5173，换来 Vite 原生 HMR。
 * 只写 CSXS/manifest.xml 和 lib/，不动别的。
 *
 * 用法：npm run dev:cep
 * 生产：npm run build（构建产物自带 prod manifest，会覆盖这里的 dev manifest）
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXT_ID = 'com.local.psz.panel.v5'
const DEV_URL = 'http://localhost:5173/'
const root = fileURLToPath(new URL('..', import.meta.url))

const appData = process.env.APPDATA
if (!appData) {
  console.error('[cep-dev] 找不到 %APPDATA%，无法定位 CEP 扩展目录')
  process.exit(1)
}
const extDir = process.env.PSZ_EXT_DIR || join(appData, 'Adobe', 'CEP', 'extensions', EXT_ID)

function copyDir(from, to) {
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    const src = join(from, name)
    const dst = join(to, name)
    if (statSync(src).isDirectory()) copyDir(src, dst)
    else copyFileSync(src, dst)
  }
}

mkdirSync(join(extDir, 'CSXS'), { recursive: true })
copyDir(join(root, 'public', 'lib'), join(extDir, 'lib'))

const manifest = readFileSync(join(root, 'public', 'CSXS', 'manifest.xml'), 'utf8')
const devManifest = manifest.replace('<MainPath>./index.html</MainPath>', `<MainPath>${DEV_URL}</MainPath>`)
if (devManifest === manifest) {
  console.error('[cep-dev] manifest.xml 里没找到 <MainPath>./index.html</MainPath>，替换失败')
  process.exit(1)
}
writeFileSync(join(extDir, 'CSXS', 'manifest.xml'), devManifest, 'utf8')

console.log(`[cep-dev] 扩展目录  ${extDir}`)
console.log(`[cep-dev] MainPath  ${DEV_URL}`)
console.log('[cep-dev] 启动后在 PS 里：窗口 → 扩展功能 → 设计助理')
