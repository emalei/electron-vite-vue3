import type {
  MeetingChannelChanged,
  MeetingChannelUpdate,
  MeetingStateSnapshot
} from '@shared/meeting'
import type { AppWindowRole, ChildWindowRole, WindowDescriptor } from '@shared/window'

/**
 * 应用内全部 IPC 通道名。
 * 作用：把主进程与渲染进程的通信协议集中定义在共享层。
 * 为什么要有：避免双方各写一份字符串常量，导致通道名漂移或拼写错误。
 */
export const IPC_CHANNELS = {
  createMeetingWindow: 'shell:create-meeting-window',
  getWindowContext: 'window:get-context',
  getMeetingSnapshot: 'meeting:get-snapshot',
  updateMeetingState: 'meeting:update-state',
  meetingStateChanged: 'meeting:state-changed'
} as const

/**
 * 创建会议窗口请求。
 * 作用：允许大厅窗口请求主进程创建一个新的会议工作区。
 * 为什么要有：会议 ID 和标题可以由调用方传入，也可以由主进程兜底生成。
 */
export interface CreateMeetingWindowRequest {
  /** 可选会议 ID，用于恢复既有会议域或外部指定会议标识。 */
  meetingId?: string
  /** 可选会议标题，用于原生窗口标题和界面展示。 */
  title?: string
}

/**
 * 创建会议窗口响应。
 * 作用：把主进程最终采用的会议 ID 和窗口 ID 返回给调用方。
 * 为什么要有：渲染层需要知道自己刚刚打开的是哪个会议实例。
 */
export interface CreateMeetingWindowResponse {
  meetingId: string
  windowId: string
}

/**
 * 当前窗口上下文。
 * 作用：让任意渲染窗口在启动后都能向主进程查询自己的身份信息。
 * 为什么要有：同一套前端代码运行在不同窗口中，必须靠上下文判断当前职责。
 */
export type WindowContext = WindowDescriptor

/**
 * 打开子窗口的请求参数。
 * 作用：描述要打开哪个会议的哪一种子窗口。
 * 为什么要有：当项目后续把 window.open 封装为更正式的 IPC 请求时，这个类型可以直接复用。
 */
export interface ChildWindowRequest {
  role: ChildWindowRole
  meetingId: string
}

/**
 * 预加载脚本暴露给渲染层的安全桥接接口。
 * 作用：把允许访问的 Electron 能力收敛到一个明确 API 面。
 * 为什么要有：开启上下文隔离后，渲染层不能直接碰 ipcRenderer，这样更安全也更易维护。
 */
export interface AppBridge {
  shell: {
    createMeetingWindow: (
      payload?: CreateMeetingWindowRequest
    ) => Promise<CreateMeetingWindowResponse>
  }
  window: {
    getContext: () => Promise<WindowContext>
  }
  meeting: {
    getSnapshot: (meetingId: string) => Promise<MeetingStateSnapshot | null>
    updateState: (payload: MeetingChannelUpdate) => Promise<void>
    onStateChanged: (callback: (payload: MeetingChannelChanged) => void) => () => void
  }
}

/**
 * 根据路由路径推导窗口角色。
 * 作用：让路由系统和窗口系统共享一套角色判断逻辑。
 * 为什么要有：同一个页面既要参与界面导航，也要参与窗口上下文推导，集中处理更可靠。
 */
export const routeToRole = (path: string): AppWindowRole => {
  if (path === '/') {
    return 'home'
  }

  if (path === '/meeting') {
    return 'meeting'
  }

  const childPath = path.replace('/child/', '')
  return childPath as ChildWindowRole
}
