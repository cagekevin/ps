import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { injectSprite } from './components/icon/sprite'
import { installErrorHandlers } from './utils/error-handler'
import './styles/tokens.css'
import './styles/global.css'
import './styles/layout.css'
import './styles/motion.css'

// 图标 sprite 必须先注入，<use href="#id"> 才有东西可引
injectSprite()

const app = createApp(App)
app.use(createPinia())

// 必须在 pinia 之后，错误处理里要用 feedback store
installErrorHandlers(app)

app.use(router)
app.mount('#app')
