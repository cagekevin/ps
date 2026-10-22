import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

/**
 * 单元 / 组件测试。**不启浏览器、不跑 e2e**，全部在 Node + jsdom 里完成。
 * 只验逻辑和 DOM 输出，不验真实 PS、不验视觉。
 */
export default defineConfig({
  plugins: [vue()],
  define: {
    __BUILD_TIME__: JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    reporters: 'default',
  },
})
