import type { ChildWindowRole } from '@shared/window'
import { router } from '@renderer/router'

/**
 * 各类子窗口的打开特征。
 * 作用：为不同角色提供更接近实际业务习惯的默认尺寸。
 * 为什么要有：名册、聊天和屏幕共享对可视面积的需求明显不同，不适合统一尺寸。
 */
const childWindowFeatures: Record<ChildWindowRole, string> = {
  gallery: 'popup=yes,width=1180,height=840',
  spotlight: 'popup=yes,width=960,height=760',
  roster: 'popup=yes,width=520,height=760',
  chat: 'popup=yes,width=520,height=760',
  'screen-share': 'popup=yes,width=1320,height=860'
}

/**
 * 子窗口引用表。
 * 作用：在当前会议根窗口里缓存已打开的各类子窗口实例。
 * 为什么要有：避免同一种角色被重复打开多个窗口，造成 UI 和状态来源混乱。
 */
const childWindowMap = new Map<ChildWindowRole, Window | null>()

/**
 * 获取仍然活着的子窗口引用。
 * 作用：读取缓存时顺便清理已经被用户关闭的窗口对象。
 * 为什么要有：window.open 返回的引用不会自动从业务缓存里消失，需要主动清洁。
 */
const getLiveChildWindow = (role: ChildWindowRole): Window | null => {
  const childWindow = childWindowMap.get(role) ?? null
  if (!childWindow || childWindow.closed) {
    childWindowMap.delete(role)
    return null
  }

  return childWindow
}

/**
 * 打开某个会议子窗口。
 * 作用：从会议根窗口发起 window.open，并确保同角色窗口单例化。
 * 为什么要有：示例项目要验证“B 窗口开子窗 + 主进程统一登记”的完整链路。
 */
export const openMeetingChildWindow = (meetingId: string, role: ChildWindowRole): Window | null => {
  const existingWindow = getLiveChildWindow(role)
  if (existingWindow) {
    // 已存在则直接聚焦，避免用户误以为点按钮没有反应。
    existingWindow.focus()
    return existingWindow
  }

  const route = router.resolve({
    name: 'child-window',
    params: { type: role },
    query: { meetingId }
  })

  const childWindow = window.open(route.href, '_blank', childWindowFeatures[role])
  childWindowMap.set(role, childWindow)

  // 监听关闭事件，及时回收角色到窗口实例的映射。
  childWindow?.addEventListener('beforeunload', () => {
    childWindowMap.delete(role)
  })

  return childWindow
}

/** 查询某个角色当前是否已有打开的子窗口。 */
export const getChildWindow = (role: ChildWindowRole): Window | null => getLiveChildWindow(role)

/**
 * 主动关闭指定角色的子窗口。
 * 作用：为后续需要从业务层控制子窗口关闭的场景预留统一入口。
 * 为什么要有：不要让各个页面直接操作裸 Window 引用，集中封装更安全。
 */
export const closeChildWindow = (role: ChildWindowRole): void => {
  const childWindow = getLiveChildWindow(role)
  childWindow?.close()
  childWindowMap.delete(role)
}
