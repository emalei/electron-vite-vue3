/**
 * 子窗口角色列表。
 * 作用：限制允许被创建的会议子窗口类型，避免任意路由都能被 window.open 打开。
 * 为什么要有：主进程需要一份白名单来校验打开请求，保证窗口拓扑可控、可追踪。
 */
export const childWindowRoles = ['gallery', 'spotlight', 'roster', 'chat', 'screen-share'] as const

/**
 * 会议子窗口角色类型。
 * 作用：让渲染进程、主进程和共享协议都使用同一套角色定义。
 * 为什么要有：减少字符串硬编码带来的拼写错误和协议不一致问题。
 */
export type ChildWindowRole = (typeof childWindowRoles)[number]

/**
 * 应用内全部窗口角色。
 * 作用：统一描述大厅窗口、会议根窗口和各类会议子窗口。
 * 为什么要有：窗口注册表需要通过角色区分生命周期和权限边界。
 */
export type AppWindowRole = 'home' | 'meeting' | ChildWindowRole

/**
 * 单个窗口在主进程中的描述对象。
 * 作用：提供跨进程共享的最小窗口身份信息。
 * 为什么要有：渲染层需要知道自己属于哪个会议域、是什么窗口、是否存在父子关系。
 */
export interface WindowDescriptor {
  /** 全局唯一窗口 ID，用于注册表定位窗口实例。 */
  windowId: string
  /** 当前窗口扮演的功能角色。 */
  role: AppWindowRole
  /** 供原生窗口标题和界面展示使用的人类可读标题。 */
  title: string
  /** 所属会议 ID。大厅窗口没有会议上下文，因此该字段可选。 */
  meetingId?: string
  /** 父窗口 ID。只有会议子窗口才会绑定父级会议根窗口。 */
  parentWindowId?: string
}

/**
 * 子窗口标题映射。
 * 作用：保证主进程创建窗口时和渲染层展示时使用一致的命名。
 * 为什么要有：窗口标题属于协议的一部分，集中管理更容易维护和扩展。
 */
export const childWindowTitles: Record<ChildWindowRole, string> = {
  gallery: '画廊视图',
  spotlight: '聚焦视图',
  roster: '参会名册',
  chat: '聊天窗口',
  'screen-share': '屏幕共享'
}
