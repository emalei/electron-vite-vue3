# Electron Meeting Foundation 中文说明

这是一个基于 Electron + Vue 3 + TypeScript 的多窗口会议脚手架。

中文文档总导航：

- [docs/index.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/index.zh-CN.md)
- [docs/session-handoff.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/session-handoff.zh-CN.md)

它当前重点解决的问题不是音视频本身，而是：

- 一个 Electron 应用里同时打开多个窗口
- 多个窗口共享同一场会议的数据
- 不同会议之间彼此隔离
- 某个窗口关闭后，不把其他窗口的状态一起带崩

## 当前已经具备的能力

- `A` 窗口：大厅窗口
- `B` 窗口：会议根窗口
- 子窗口：`gallery`、`spotlight`、`roster`、`chat`、`screen-share`
- 共享状态统一保存在 `main process`
- 每个会议通过 `meetingId` 隔离
- 子窗口通过 `window.open` 从 `B` 窗口打开
- 主进程统一登记窗口和父子关系
- 支持按频道配置 `realtime` 或 `batched` 同步
- `B` 窗口关闭时，自动关闭全部子窗口并销毁会议状态

## 为什么这个项目要这样设计

在普通单窗口前端里，状态通常放在页面内存里就够了。

但 Electron 多窗口不是这个情况。

如果把会议状态放在某个渲染窗口里，会立刻遇到这些问题：

- 关闭这个窗口后，其他窗口找不到状态真源
- 新开的窗口不知道当前会议已经进行到哪里
- 不同窗口可能各自维护一份状态副本，最终互相打架

所以这个项目把共享会议状态放进主进程，渲染窗口只做两件事：

- 读取快照
- 发起修改请求

真正的状态更新和广播都在主进程完成。

## 窗口结构

### Window A：大厅窗口

作用：

- 作为应用入口
- 只负责发起新的会议窗口

为什么要单独存在：

- 把“进会前入口”和“会中工作区”拆开
- 避免大厅页混入实时会议状态逻辑

对应文件：

- [HomePage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/HomePage.vue)

### Window B：会议根窗口

作用：

- 承载单个 `meetingId` 的主工作区
- 打开子窗口
- 读写共享状态

为什么要单独存在：

- 每场会议都需要一个明确的父窗口
- 关闭这个窗口时，可以顺带结束整场会议的生命周期

对应文件：

- [MeetingPage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/MeetingPage.vue)

### 子窗口

作用：

- 承担某种聚焦视图，比如画廊、聚焦、名册、聊天、共享屏幕
- 和 `B` 窗口共享同一个会议域

为什么要存在：

- 真实会议产品很常见这种拆窗模式
- 这也是验证多窗口共享状态最直接的场景

对应文件：

- [ChildWindowPage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/ChildWindowPage.vue)
- [childWindows.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/utils/childWindows.ts)

## 状态结构

共享状态定义在：

- [meeting.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/meeting.ts)

当前频道包括：

- `members`
- `config`
- `layout`
- `handRaise`
- `chat`
- `shared`

这样拆的原因是：

- 不同数据的变化频率不同
- 不同数据对实时性的要求不同
- 主进程可以按频道设置不同同步策略

例如：

- `layout` 更适合实时同步
- `members` 和 `chat` 更适合短时间批量同步

## 关键流程

### 1. 打开会议

流程：

1. 大厅窗口点击打开会议
2. 渲染层调用 `window.electronAPI.shell.createMeetingWindow`
3. 主进程生成或确认 `meetingId`
4. `MeetingHub` 创建默认会议快照
5. `WindowRegistry` 创建 `B` 窗口
6. `B` 窗口启动后读取自己的窗口上下文和会议快照

### 2. 打开子窗口

流程：

1. `B` 窗口点击某个子窗口按钮
2. 渲染层通过 `window.open` 打开对应路由
3. 主进程拦截 `window.open`
4. 主进程校验角色是否合法、`meetingId` 是否匹配
5. 主进程创建子窗口并登记父子关系
6. 子窗口启动后读取同一个 `meetingId` 的快照

### 3. 更新共享状态

流程：

1. 任意窗口调用 `updateState`
2. 主进程 `MeetingHub` 接收更新
3. 主进程更新会议快照和版本号
4. 按频道规则决定实时广播或批量广播
5. 同一 `meetingId` 下的窗口收到变更并更新本地副本

### 4. 关闭会议

流程：

1. 用户关闭 `B` 窗口
2. `WindowRegistry` 找到它的全部子窗口
3. 主进程逐个关闭子窗口
4. 主进程通知 `MeetingHub` 销毁该会议状态
5. 内存中的快照、待广播队列和定时器一起被清理

## 目录结构

```text
electron/
  main/       主进程代码，负责窗口和共享状态
  preload/    安全桥接层，向渲染层暴露 electronAPI
src/
  shared/     主进程与渲染进程共享的协议和类型
  renderer/   Vue 页面、组件、样式和 store
docs/         项目结构与流程文档
```

## 你应该先看哪些文件

建议阅读顺序：

1. [README.md](/Users/m/工作/electron-vite-vue3-ts/README.md)
2. [README.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/README.zh-CN.md)
3. [src/shared/window.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/window.ts)
4. [src/shared/ipc.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/ipc.ts)
5. [src/shared/meeting.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/meeting.ts)
6. [electron/main/services/window-registry.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/window-registry.ts)
7. [electron/main/services/meeting-hub.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/meeting-hub.ts)
8. [src/renderer/src/stores/meetingSession.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/stores/meetingSession.ts)
9. [src/renderer/src/pages/MeetingPage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/MeetingPage.vue)
10. [docs/project-architecture-notes.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/project-architecture-notes.zh-CN.md)
11. [docs/page-flow-notes.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/page-flow-notes.zh-CN.md)
12. [docs/sequence-diagrams.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/sequence-diagrams.zh-CN.md)

## 适合拿这个项目做什么

- 多窗口 Electron 原型
- 会议类桌面产品原型
- 多窗口共享状态基础设施
- 后续接 RTC SDK 之前的架构底座
- 学习 Electron 主进程和渲染进程分层
