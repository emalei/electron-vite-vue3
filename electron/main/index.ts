import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import { IPC_CHANNELS } from '@shared/ipc'
import { MeetingHub } from '@main/services/meeting-hub'
import { WindowRegistry } from '@main/services/window-registry'
import { registerIpcHandlers } from '@main/ipc/register-ipc'

/**
 * 预加载脚本的构建产物路径。
 * 作用：让每个 BrowserWindow 都能挂载受控的 Electron API 桥。
 * 为什么要有：上下文隔离打开后，渲染层功能完全依赖 preload 暴露的安全接口。
 */
const preloadPath = fileURLToPath(new URL('../preload/index.mjs', import.meta.url))

/**
 * 窗口注册中心。
 * 作用：统一管理大厅窗口、会议根窗口和会议子窗口的创建与销毁。
 * 为什么要有：多窗口应用必须有一个主进程级索引，否则无法做广播和生命周期联动。
 */
let windowRegistry: WindowRegistry | null = null

/**
 * 会议状态中心。
 * 作用：把跨窗口共享的会议状态固定存放在主进程，而不是放在某个页面里。
 * 为什么要有：任何单个窗口关闭都不应直接造成其余窗口状态丢失。
 */
let meetingHub: MeetingHub | null = null

/**
 * 应用启动入口。
 * 作用：在 Electron ready 后串起状态中心、窗口注册和 IPC 协议。
 * 为什么要有：这些对象之间有依赖关系，集中初始化更容易保证顺序正确。
 */
const bootstrap = async (): Promise<void> => {
  await app.whenReady()

  // 状态中心只负责产生变更，真正广播给哪些窗口由窗口注册表决定。
  meetingHub = new MeetingHub((meetingId, payload) => {
    windowRegistry?.broadcastToMeeting(meetingId, IPC_CHANNELS.meetingStateChanged, payload)
  })

  // 当会议根窗口被关闭时，顺带销毁该会议域，避免主进程残留无主状态。
  windowRegistry = new WindowRegistry({
    preloadPath,
    onMeetingClosed: (meetingId) => {
      meetingHub?.destroyMeeting(meetingId)
    }
  })

  registerIpcHandlers(windowRegistry, meetingHub)
  windowRegistry.createHomeWindow()

  app.on('activate', () => {
    // macOS 上用户关闭全部窗口后，通常仍希望点击 Dock 图标重新打开入口窗口。
    if (BrowserWindow.getAllWindows().length === 0) {
      windowRegistry?.createHomeWindow()
    }
  })
}

app.on('window-all-closed', () => {
  // 非 macOS 平台遵循“关完窗口即退出应用”的常见桌面应用行为。
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

bootstrap()
