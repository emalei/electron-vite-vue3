import { contextBridge, ipcRenderer } from "electron";
const IPC_CHANNELS = {
  createMeetingWindow: "shell:create-meeting-window",
  getWindowContext: "window:get-context",
  getMeetingSnapshot: "meeting:get-snapshot",
  updateMeetingState: "meeting:update-state",
  meetingStateChanged: "meeting:state-changed"
};
const api = {
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
      const listener = (_event, payload) => {
        callback(payload);
      };
      ipcRenderer.on(IPC_CHANNELS.meetingStateChanged, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.meetingStateChanged, listener);
      };
    }
  }
};
contextBridge.exposeInMainWorld("electronAPI", api);
