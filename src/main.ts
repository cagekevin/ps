import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { injectSprite } from './components/icon/sprite'
import { installErrorHandlers } from './utils/error-handler'
import { log } from './utils/logger'
import './styles/tokens.css'
import './styles/global.css'
import './styles/layout.css'
import './styles/motion.css'

// 图标 sprite 必须先注入，<use href="#id"> 才有东西可引
injectSprite()

// 环境自检：CEP 的 Chromium 版本决定哪些 CSS 特性可用（@container、:focus-visible、@layer）。
// 这条只在控制台打一次，用来把"CEP 12 = Chromium 99"从猜测变成事实。
log.info('env', `UA: ${navigator.userAgent}`)
log.info('env', `inCep=${typeof window.__adobe_cep__ === 'object'} node=${typeof window.require === 'function'}`)

const app = createApp(App)
app.use(createPinia())

// 必须在 pinia 之后，错误处理里要用 feedback store
installErrorHandlers(app)

app.use(router)
app.mount('#app')
