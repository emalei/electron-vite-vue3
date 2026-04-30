import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS, type CreateMeetingWindowRequest, type CreateMeetingWindowResponse } from '@shared/ipc'
import type { MeetingChannelUpdate } from '@shared/meeting'
import { MeetingHub } from '@main/services/meeting-hub'
import { WindowRegistry } from '@main/services/window-registry'

/**
 * 注册全部主进程 IPC 处理器。
 * 作用：把窗口管理和会议状态能力暴露给渲染层。
 * 为什么要有：渲染层不能直接访问主进程对象，所有受控能力都必须经过 IPC。
 */
export const registerIpcHandlers = (windowRegistry: WindowRegistry, meetingHub: MeetingHub): void => {
  ipcMain.handle(
    IPC_CHANNELS.createMeetingWindow,
    (_event, payload?: CreateMeetingWindowRequest): CreateMeetingWindowResponse => {
      // 主进程兜底生成会议 ID 和标题，保证大厅窗口可以零参数直接开会场。
      const meetingId = payload?.meetingId ?? crypto.randomUUID()
      const title = payload?.title ?? `会议 ${meetingId.slice(0, 6)}`
      meetingHub.ensureMeeting(meetingId, title)
      const descriptor = windowRegistry.createMeetingWindow({ meetingId, title })
      return {
        meetingId,
        windowId: descriptor.windowId
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.getWindowContext, (event) => {
    // 先校验 sender 确实对应一个 BrowserWindow，避免无效 webContents 混入协议。
    if (!BrowserWindow.fromWebContents(event.sender)) {
      throw new Error('Unable to resolve BrowserWindow from sender.')
    }

    // 上下文由窗口注册表统一维护，渲染层不自行推断，避免和主进程真实窗口记录偏离。
    const context = windowRegistry.getContextByWebContentsId(event.sender.id)
    if (!context) {
      throw new Error('Window context not found.')
    }

    return context
  })

  ipcMain.handle(IPC_CHANNELS.getMeetingSnapshot, (_event, meetingId: string) => {
    return meetingHub.getSnapshot(meetingId)
  })

  ipcMain.handle(IPC_CHANNELS.updateMeetingState, (event, payload: MeetingChannelUpdate) => {
    // sourceWindowId 由主进程补齐，避免渲染层伪造来源窗口身份。
    const context = windowRegistry.getContextByWebContentsId(event.sender.id)
    meetingHub.update({
      ...payload,
      sourceWindowId: context?.windowId
    })
  })
}
