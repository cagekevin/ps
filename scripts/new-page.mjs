import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)

function option(name, fallback = '') {
  const prefix = `--${name}=`
  const hit = args.find((arg) => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

const template = option('template', 'settings')
const route = option('route')
const rawName = option('name', route ? route.split('/').filter(Boolean).at(-1) : '')
const title = option('title', rawName)
const dryRun = args.includes('--dry-run')
const nav = !args.includes('--no-nav')

if (!['settings', 'list', 'detail'].includes(template)) {
  console.error('template 只能是 settings / list / detail')
  process.exit(1)
}

if (!rawName || !/^[a-z][a-z0-9-]*$/.test(rawName)) {
  console.error('name 必须是 kebab-case，例如 style-library')
  process.exit(1)
}

if (route && !/^\/[a-z0-9/_-]+$/.test(route)) {
  console.error('route 必须以 / 开头，只允许小写字母、数字、-、_、/')
  process.exit(1)
}

const pageDir = join(root, 'src', 'pages', rawName)
const pageFile = join(pageDir, 'index.vue')

if (existsSync(pageFile)) {
  console.error(`页面已存在：${pageFile}`)
  process.exit(1)
}

const templates = {
  settings: `<script setup lang="ts">
import { ref } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import PageShell from '@/components/PageShell.vue'
import SettingsSection from '@/components/SettingsSection.vue'

const enabled = ref(false)
</script>

<template>
  <PageShell title="${title}">
    <SettingsSection title="基本设置" :default-open="true">
      <CheckBox v-model="enabled">开启选项</CheckBox>
    </SettingsSection>
  </PageShell>
</template>
`,
  list: `<script setup lang="ts">
import { ref } from 'vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import PageShell from '@/components/PageShell.vue'

const keyword = ref('')
</script>

<template>
  <PageShell title="${title}">
    <template #toolbar>
      <GInput v-model="keyword" placeholder="搜索" clearable size="small" />
      <GButton size="small">操作</GButton>
    </template>

    <p>列表内容放在这里。行内控件只能使用组件宪法里的件。</p>
  </PageShell>
</template>
`,
  detail: `<script setup lang="ts">
import { ref } from 'vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import PageShell from '@/components/PageShell.vue'

const name = ref('')
</script>

<template>
  <PageShell title="${title}">
    <GInput v-model="name" placeholder="名称" />
    <GButton type="primary" block>保存</GButton>
  </PageShell>
</template>
`,
}

const pageCode = templates[template]
const routeCode = route
  ? `
  {
    path: '${route}',
    name: '${rawName.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())}',
    component: () => import('@/pages/${rawName}/index.vue'),
    meta: { title: '${title}',${nav ? ' nav: true,' : ''} },
  },
`
  : ''

const routerFile = join(root, 'src', 'router', 'index.ts')
let routerNext = ''

if (route) {
  const routerText = readFileSync(routerFile, 'utf8')
  const marker = '  // @new-page'
  if (!routerText.includes(marker)) {
    console.error('router 缺少 // @new-page 标记，拒绝自动插入')
    process.exit(1)
  }
  if (routerText.includes(`path: '${route}'`)) {
    console.error(`路由已存在：${route}`)
    process.exit(1)
  }
  routerNext = routerText.replace(marker, `${marker}\n${routeCode}`)
}

if (dryRun) {
  console.log(`--- src/pages/${rawName}/index.vue ---`)
  console.log(pageCode)
  if (route) {
    console.log(`--- ${route} ---`)
    console.log(routeCode)
  }
  process.exit(0)
}

mkdirSync(pageDir, { recursive: true })
writeFileSync(pageFile, pageCode, 'utf8')

if (route) writeFileSync(routerFile, routerNext, 'utf8')

console.log(`已创建：${pageFile}`)
if (route) console.log(`已注册路由：${route}`)
console.log('下一步：填业务内容，不要加页面级控件样式。')
