import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { IPC_CHANNELS, type AppBridge } from '@shared/ipc'
import type { MeetingChannelChanged } from '@shared/meeting'

/**
 * 暴露给渲染层的受控 API。
 * 作用：把“创建窗口、读取上下文、读写会议状态”这些能力收敛成白名单接口。
 * 为什么要有：开启 contextIsolation 后，渲染层不能也不应该直接拿到完整 Electron 能力。
 */
const api: AppBridge = {
  shell: {
    // 大厅窗口通过这个接口请求主进程创建新的会议根窗口。
    createMeetingWindow: (payload) => ipcRenderer.invoke(IPC_CHANNELS.createMeetingWindow, payload)
  },
  window: {
    // 每个窗口启动时先确认自己是谁，属于哪个会议域。
    getContext: () => ipcRenderer.invoke(IPC_CHANNELS.getWindowContext)
  },
  meeting: {
    // 新窗口冷启动需要完整快照，而不是只等后续增量广播。
    getSnapshot: (meetingId) => ipcRenderer.invoke(IPC_CHANNELS.getMeetingSnapshot, meetingId),
    // 统一通过主进程修改共享状态，保证多窗口只存在一个真源。
    updateState: (payload) => ipcRenderer.invoke(IPC_CHANNELS.updateMeetingState, payload),
    onStateChanged: (callback) => {
      // 单独包装 listener，便于后续 removeListener 精确解绑，避免窗口切换后泄漏订阅。
      const listener = (_event: IpcRendererEvent, payload: MeetingChannelChanged) => {
        callback(payload)
      }

      ipcRenderer.on(IPC_CHANNELS.meetingStateChanged, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.meetingStateChanged, listener)
      }
    }
  }
}

// 只暴露 electronAPI，不把整个 ipcRenderer 直接挂到 window 上，减少误用面。
contextBridge.exposeInMainWorld('electronAPI', api)
