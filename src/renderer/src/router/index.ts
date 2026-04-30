import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '@renderer/pages/HomePage.vue'
import MeetingPage from '@renderer/pages/MeetingPage.vue'
import ChildWindowPage from '@renderer/pages/ChildWindowPage.vue'

/**
 * 应用路由器。
 * 作用：把同一套渲染进程代码映射为大厅、会议主窗口和子窗口三类页面。
 * 为什么要有：Electron 多窗口并不排斥前端路由，反而可以复用页面组件和导航解析能力。
 */
export const router = createRouter({
  // Electron 生产环境通常使用 file://，Hash 路由无需服务端回退，兼容性更稳。
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      // 大厅页只负责开启新的会议窗口，不承载会议共享状态。
      name: 'home',
      component: HomePage
    },
    {
      path: '/meeting',
      // 会议根窗口是某个 meetingId 的主工作区和子窗口父节点。
      name: 'meeting',
      component: MeetingPage
    },
    {
      path: '/child/:type(gallery|spotlight|roster|chat|screen-share)',
      // 所有子窗口复用同一页面组件，通过动态参数切换角色视图。
      name: 'child-window',
      component: ChildWindowPage,
      props: true
    }
  ]
})
