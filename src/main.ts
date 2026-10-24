import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@/commands'
import { injectSprite } from './components/icon/sprite'
import { installErrorHandlers } from './utils/error-handler'
import { installStartupCheck } from './utils/build-info'
import { onSettingsWriteError } from './cep/data/settings'
import { attachLogSink, log } from './utils/logger'
import { createLogFileSink } from './cep/log-file'
import { useFeedbackStore } from './stores/feedback'
import { bindFontData } from './stores/font'
import { bindActionData } from './stores/action'
import { bindFreePanelData } from './stores/free-panel'
import { bindFontSetData } from './stores/font-set'
import { installCommonUseSource } from './stores/common-use'
import { commonUseRepo } from './cep/data/common-use'
import { bindRenameData } from './stores/rename'
import { bindSwatchData } from './stores/swatch'
import { bindSeBanReceiver } from './commands/swatch'
import { useTaskStore } from './stores/tasks'
import { setProgressPort } from './commands/runtime'
import { startSelectionWatch } from './selection'
import { startCloudAutoSync } from './cloud/auto-sync'
import './styles/tokens.css'
import './styles/global.css'
import './styles/layout.css'
import './styles/motion.css'

// 日志落盘必须最先接：之后任何模块的 log.* 都会被留下来（关掉重开还查得到）。
// 落盘口自己负责节流/上限/失败留痕，这里只装配。
attachLogSink(createLogFileSink((reason) => log.warn('logger', '日志落盘失败', reason)))

// 图标 sprite 必须先注入，<use href="#id"> 才有东西可引
injectSprite()

// 版本/构建时间/CEP 环境自检；只告警，不阻断启动
installStartupCheck()

const app = createApp(App)
app.use(createPinia())

// 数据仓库写成功后刷新只读投影（命令层是唯一写入点）
bindFontData()
bindActionData()
bindFreePanelData()
bindFontSetData()
installCommonUseSource(commonUseRepo)
bindRenameData()
// 色板投影：本面板的命令写完文件（onChange）与别处写完发的 app event 都汇到这里重读。
// 两个进程都会绑上——主面板那份是空转（多读三个小文件），换来"换入口时不会漏绑"。
bindSwatchData()

// 长任务状态由 store 实现，命令层只依赖端口（commands 不许依赖 stores）
setProgressPort({
  begin(title) {
    const store = useTaskStore()
    const id = store.begin(title)
    return {
      update: (progress, detail) => store.update(id, { progress, detail }),
      end: () => store.end(id),
      setCancel: (cancel) => store.setCancel(id, cancel),
    }
  },
})

// 偏好写失败必须可见（ADR-14），不能只留在控制台
onSettingsWriteError((message) => useFeedbackStore().error(`偏好保存失败：${message}`))

// 必须在 pinia 之后，错误处理里要用 feedback store
installErrorHandlers(app)

app.use(router)
app.mount('#app')

// 自由面板是独立 CEP 面板，不订阅主面板的选区事件，避免同一扩展注册两次。
//
// 入口由 public/freePanel.html 显式声明（?panel=freePanel），不靠 hash 猜（D-34）：
// 换入口方式（改路由、换 html 入口）时 hash 判断会静默失效。
// UNVERIFIED: 独立面板在 PS 里是否仍被正确识别（CEP 双击面板窗口）——未起真实 PS，未实测。
const standalonePanel = new URLSearchParams(window.location.search).get('panel')
const standaloneFreePanel = standalonePanel === 'freePanel'
// 色板面板（刀3 才建）也是独立入口；它必须**不绑**接收端，否则自己发的广播自己执行一遍
const standaloneSeban = standalonePanel === 'seBan'

// 事件不可用时会自己降级成"操作前查询"，不阻塞启动
if (!standaloneFreePanel) {
  // 色板面板也要选区快照：左键上色前要判"有没有选中图层"（`requires: 'layer'`）
  void startSelectionWatch()
}

if (!standaloneFreePanel && !standaloneSeban) {
  // 色板 → 主面板：左键填充 / 右键描边（官方 `handleSeBanEvent`，`app.v4.js:17878`）。
  // 色板面板自己也会收到自己发的广播，所以那边**不绑**。
  bindSeBanReceiver()
  startCloudAutoSync()
}
