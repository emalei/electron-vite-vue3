import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@renderer/App.vue'
import { router } from '@renderer/router'
import '@renderer/styles/main.css'

/**
 * Vue 应用实例。
 * 作用：作为渲染进程 UI 的根容器，挂载路由、状态管理和全局样式。
 * 为什么要有：Electron 只是窗口宿主，真正的界面仍由前端应用生命周期驱动。
 */
const app = createApp(App)

// Pinia 负责当前窗口内的状态编排和共享快照消费。
app.use(createPinia())
// 路由负责区分大厅页、会议页和子窗口页。
app.use(router)
// 挂载到 index.html 里的根节点，启动整个渲染进程应用。
app.mount('#app')
