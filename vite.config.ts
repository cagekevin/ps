import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { join } from 'node:path'

const EXT_ID = 'com.local.psz.panel.v5'
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

/**
 * 构建产物直接落到 CEP 扩展目录：build 即部署。
 * 想构建到别处（做对比、打包），设环境变量 PSZ_EXT_DIR 覆盖。
 */
function resolveOutDir(): string {
  const custom = process.env.PSZ_EXT_DIR
  if (custom) return custom
  const appData = process.env.APPDATA
  if (!appData) {
    throw new Error('找不到 %APPDATA%，请设置 PSZ_EXT_DIR 指定输出目录')
  }
  return join(appData, 'Adobe', 'CEP', 'extensions', EXT_ID)
}

const outDir = resolveOutDir()

// 只有确认目标就是本扩展目录时才允许清空，防止路径配错误删别的目录
const safeToEmpty = outDir.replace(/\\/g, '/').endsWith(`/extensions/${EXT_ID}`)

/**
 * CEP 走 file://，模块脚本会被 CORS 拦掉（origin 是 null），直接白屏。
 * 产物本身是 IIFE，改成普通脚本即可。
 *
 * 必须保留 defer：脚本在 head 里，去掉 type="module" 后变成阻塞脚本，
 * 会在 <body> 解析前执行，此时 #app 还不存在，mount 失败 → 面板全黑。
 */
function cepHtml(): Plugin {
  return {
    name: 'cep-html',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/\scrossorigin/g, '')
    },
  }
}

export default defineConfig({
  // CEP 走 file://，必须是相对路径
  base: './',
  plugins: [vue(), cepHtml()],

  // 构建时间戳：排查"改了没生效"时，先确认面板里跑的是哪次构建
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 19).replace('T', ' ')),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir,
    emptyOutDir: safeToEmpty,
    // 为什么不是 chrome91：本机 esbuild 0.28.2 在 Windows 上删除自己的临时目录必失败
    // （`remove ...esbuild-<hash>: Access is denied`），只有产物级的 vite:esbuild-transpile
    // 会触发；该插件仅在 target !== 'esnext' 时运行，所以提到 esnext 直接跳过这一步。
    // 代价：不再向 chrome91 降级语法。CEP 12 = Chromium 99，现代语法支持足够。
    // 详见 docs/架构/决策记录.md ADR-18（换机器或升级 esbuild 后应回到 chrome91 复核）。
    target: 'esnext',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        // CEF 在 file:// 下对 ESM chunk 支持不稳，P1 先出单包 IIFE
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
