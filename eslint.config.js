import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * ESLint 9 flat config。
 *
 * 只开官方 Priority A（essential）+ TS 推荐，不做风格战争：
 * 格式化已经统一，不引 prettier；新增规则必须先确认不会制造噪音。
 */
export default tseslint.config(
  // .tmp-*/ / probe-* 是排查用的临时产物（headless Chrome 的 user-data-dir、dump 出来的 html），
  // 里面可能带 .js（Chrome 自带扩展），不排除就会让 lint 报上千条无关错误。
  { ignores: ['dist/**', 'node_modules/**', 'public/**', '*.log', '.tmp-*/**', 'probe-*'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },

  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        // vite define
        __BUILD_TIME__: 'readonly',
      },
    },
    rules: {
      // TS 自己会查未定义；no-undef 在 TS 里是噪音
      'no-undef': 'off',
      // 面板里允许 console（logger 统一出口，业务代码不能用）
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}', 'vitest.config.ts', 'vite.config.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  {
    rules: {
      // 已评估的偏离：Icon / Rating 不是 HTML 保留元素，改名要动 ~30 处引用、
      // 功能零收益。见台账 T-27 说明。
      'vue/multi-word-component-names': ['error', { ignores: ['Icon', 'Rating'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    // ADR-16 护栏：命令层不能依赖视图/状态层，否则"多入口复用"立刻失效
    files: ['src/commands/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/pages/*',
                '@/pages/**',
                '@/stores/*',
                '@/stores/**',
                '@/components/*',
                '@/components/**',
              ],
              message: '命令层不能依赖视图/状态层（ADR-16）',
            },
          ],
        },
      ],
    },
  },

  {
    // ADR-16 护栏：页面只能经 commands 访问 PS 能力与数据仓库
    files: ['src/pages/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/cep/jsx',
                '@/cep/jsx/*',
                '@/cep/data',
                '@/cep/data/*',
                '@/cep/events',
                '@/cep/events/*',
              ],
              message: '页面只能经 commands / store 访问 PS 能力、事件与数据（ADR-16/17）',
            },
          ],
        },
      ],
    },
  },

  {
    // 必须放在最后：路由入口叫 index.vue 是约定，组件名不参与模板解析
    files: ['src/pages/**/index.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },

  {
    // 单点豁免：`#/__probe` 开发探针（T-06，不进导航）
    //
    // 为什么不能改代码走 commands / store / utils/jsx-result：
    // - 命令层结构上回不了原始数据：`Command.run` 返回 `Promise<void>`，
    //   `CommandResult` 只有 ok/reason/code/message（commands/types.ts:59-75），
    //   `registry.execute` 也只返回 CommandResult（registry.ts:117）。
    // - store 给的是归一化结果：`stores/font.fetchList` 走 `normalizeFontList`，
    //   `stores/action.loadPsActions` 走 `readActionList`（已解析的 ActionGroup）。
    // - `utils/jsx-result` 的文件头写明"页面/组件不 import"，且 `asJsxResult`
    //   会拆掉 `{err,msg}` 外壳——正是探针必须原样看的东西。
    // 三条通道都只给"解释过的结果"，探针要的是"未解释的原始返回"。
    //
    // 为什么不算破 ADR-16/17：护栏要防的是"同一操作在每个入口各写一遍"，
    // 而探针不产生操作、不进导航、不写任何状态，只把 jsx 返回打出来给人看。
    // 为了让探针显示归一化后的数据而改 `CommandResult` 契约，才是拿架构换绿灯。
    //
    // 只放开 `cep/jsx` 一条：`cep/data` / `cep/events` 仍然禁，护栏不全清。
    files: ['src/pages/_probe/index.vue'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/cep/data', '@/cep/data/*', '@/cep/events', '@/cep/events/*'],
              message: '页面只能经 commands / store 访问 PS 能力、事件与数据（ADR-16/17）',
            },
          ],
        },
      ],
    },
  },
)
