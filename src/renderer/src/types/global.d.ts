import type { AppBridge } from '@shared/ipc'

declare global {
  interface Window {
    /**
     * 预加载脚本暴露的 Electron API。
     * 作用：作为渲染层访问主进程能力的唯一入口。
     * 为什么要有：显式声明后，页面代码在使用 window.electronAPI 时才能获得完整类型提示。
     */
    electronAPI: AppBridge
  }
}

export {}
