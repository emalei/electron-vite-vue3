# 项目架构说明

## 项目当前在做什么

这个项目是一个基于 Electron + Vue 3 + TypeScript 的多窗口会议脚手架。

它当前已经实现的功能是：

- 一个大厅窗口，用来发起会议
- 每个 `meetingId` 对应一个独立的会议根窗口
- 会议根窗口可以继续打开多个子窗口
- 多个窗口共享同一份会议状态
- 共享状态统一存放在 Electron 主进程
- 共享状态通过 IPC 读取、修改和广播
- 不同状态频道可以配置为实时同步或批量同步

这个设计存在的根本原因是：
Electron 多窗口应用一旦把状态放进某个单独的渲染窗口，关闭那个窗口后，其他窗口就很容易失去状态真源。这个项目把状态提升到主进程，就是为了避免这个问题。

## 整体分层

### `src/shared`

代表文件：

- [meeting.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/meeting.ts)
- [ipc.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/ipc.ts)
- [window.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/window.ts)

作用：

- 定义会议状态结构
- 定义窗口角色
- 定义 IPC 协议

为什么要有这一层：

- 主进程和渲染进程都要用到这些类型和常量
- 如果各写各的，很容易出现通道名不一致、字段名不一致、窗口角色不一致

### `electron/main`

代表文件：

- [index.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/index.ts)
- [meeting-hub.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/meeting-hub.ts)
- [window-registry.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/window-registry.ts)
- [register-ipc.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/ipc/register-ipc.ts)

作用：

- 创建和管理所有原生窗口
- 保存每个会议域的共享状态
- 接收渲染层发来的 IPC 请求
- 向同一会议的所有窗口广播状态变化

为什么要有这一层：

- 只有主进程同时看得到所有窗口
- 只有主进程适合做状态真源和生命周期裁决者

### `electron/preload`

代表文件：

- [index.ts](/Users/m/工作/electron-vite-vue3-ts/electron/preload/index.ts)

作用：

- 把允许暴露给渲染层的 Electron 能力挂到 `window.electronAPI`

为什么要有这一层：

- 开启 `contextIsolation` 后，渲染层不能直接访问 Electron API
- 即使能直接访问，也不应该把完整 IPC 能力裸暴露给页面

### `src/renderer`

代表文件：

- [main.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/main.ts)
- [router/index.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/router/index.ts)
- [meetingSession.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/stores/meetingSession.ts)
- [HomePage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/HomePage.vue)
- [MeetingPage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/MeetingPage.vue)
- [ChildWindowPage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/ChildWindowPage.vue)

作用：

- 渲染 UI
- 根据当前窗口身份展示对应页面
- 拉取共享快照
- 发起状态更新请求

为什么要有这一层：

- 渲染层应该专注界面和交互，不应该承担窗口系统和状态真源职责

## 按文件解释

### [package.json](/Users/m/工作/electron-vite-vue3-ts/package.json)

作用：

- 声明项目名称、版本、脚本和依赖

为什么要有：

- Node/Electron 项目的基础入口配置
- `dev`、`build`、`typecheck`、`lint` 都从这里统一定义

### [README.md](/Users/m/工作/electron-vite-vue3-ts/README.md)

作用：

- 给项目提供最简启动方式和架构摘要

为什么要有：

- 新接手的人先看 README 才知道这个仓库大致解决什么问题

### [electron.vite.config.ts](/Users/m/工作/electron-vite-vue3-ts/electron.vite.config.ts)

作用：

- 配置主进程、预加载、渲染进程的构建入口、别名和输出目录

为什么要有：

- Electron 不是普通单前端项目，它有三套代码运行域，必须分别配置

### [tsconfig.json](/Users/m/工作/electron-vite-vue3-ts/tsconfig.json)

作用：

- 配置 TypeScript 编译器行为和路径别名

为什么要有：

- 共享协议、跨进程数据结构和 Vue 组件都需要统一类型系统约束

### [eslint.config.mjs](/Users/m/工作/electron-vite-vue3-ts/eslint.config.mjs)

作用：

- 配置 JS、TS、Vue 的静态检查规则

为什么要有：

- 多层技术栈项目如果没有统一规则，代码风格和安全边界会很快失控

### [prettier.config.mjs](/Users/m/工作/electron-vite-vue3-ts/prettier.config.mjs)

作用：

- 配置自动格式化规则

为什么要有：

- 保证代码排版一致，减少无意义格式差异

### [electron/main/index.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/index.ts)

作用：

- Electron 主进程启动入口
- 初始化 `MeetingHub`
- 初始化 `WindowRegistry`
- 注册 IPC
- 打开大厅窗口

为什么要有：

- 这是整个桌面应用生命周期的总装配点

### [electron/main/ipc/register-ipc.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/ipc/register-ipc.ts)

作用：

- 注册所有 IPC handler

为什么要有：

- 主进程能力必须通过明确协议暴露，不能散落在各个文件里临时注册

### [electron/main/services/meeting-hub.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/meeting-hub.ts)

作用：

- 保存每个 `meetingId` 的完整会议快照
- 应用频道更新
- 按频道规则决定实时广播还是批量广播

为什么要有：

- 这是跨窗口共享状态的核心
- 没有它，多窗口只能各自维护自己的局部状态副本

### [electron/main/services/window-registry.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/window-registry.ts)

作用：

- 创建大厅窗口
- 创建会议根窗口
- 接管 `window.open`
- 登记父子窗口关系
- 在关闭时做级联清理

为什么要有：

- 多窗口 Electron 应用最怕窗口引用丢失、父子关系丢失、孤儿窗口残留
- 注册表是解决这些问题的主进程中心

### [electron/preload/index.ts](/Users/m/工作/electron-vite-vue3-ts/electron/preload/index.ts)

作用：

- 把 `createMeetingWindow`、`getContext`、`getSnapshot`、`updateState`、`onStateChanged` 暴露到渲染层

为什么要有：

- 它是安全桥接层，既给页面能力，又不把完整底层对象暴露出去

### [src/shared/window.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/window.ts)

作用：

- 定义窗口角色、窗口描述对象、子窗口标题

为什么要有：

- 主进程和渲染层都必须对“窗口是什么”有统一认识

### [src/shared/ipc.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/ipc.ts)

作用：

- 定义 IPC 通道名和桥接接口

为什么要有：

- 跨进程协议是整个项目的胶水层，不集中管理很快就会漂移

### [src/shared/meeting.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/meeting.ts)

作用：

- 定义会议频道、快照、更新负载、同步规则和演示初始数据

为什么要有：

- 这是共享状态协议本身，项目绝大多数核心概念都从这里展开

### [src/renderer/src/main.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/main.ts)

作用：

- 创建 Vue 应用并挂载 Pinia、路由和全局样式

为什么要有：

- 渲染层需要一个统一的前端应用入口

### [src/renderer/src/App.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/App.vue)

作用：

- 在根组件启动时执行会话 bootstrap
- 承载路由视图

为什么要有：

- 所有窗口页面都依赖同一套上下文初始化流程

### [src/renderer/src/router/index.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/router/index.ts)

作用：

- 定义大厅页、会议页、子窗口页路由

为什么要有：

- 同一套渲染层代码需要在不同窗口里复用不同页面

### [src/renderer/src/stores/meetingSession.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/stores/meetingSession.ts)

作用：

- 获取当前窗口上下文
- 获取会议快照
- 订阅会议状态变更
- 向主进程提交频道更新

为什么要有：

- 把会话生命周期逻辑从页面组件里抽离，避免重复实现

### [src/renderer/src/utils/childWindows.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/utils/childWindows.ts)

作用：

- 管理子窗口打开、聚焦、缓存和关闭

为什么要有：

- 同角色子窗口需要单例化
- 页面代码不应该到处直接操作裸 `window.open`

### [src/renderer/src/layouts/WorkspaceLayout.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/layouts/WorkspaceLayout.vue)

作用：

- 提供通用页面布局骨架

为什么要有：

- 大厅页、会议页、子窗口页结构高度相似，抽出来更容易维护

### [src/renderer/src/components/StatPanel.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/components/StatPanel.vue)

作用：

- 展示标题、主值、说明的小型统计卡片

为什么要有：

- 会议类 UI 常需要快速展示关键指标

### [src/renderer/src/components/WindowBadge.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/components/WindowBadge.vue)

作用：

- 展示窗口角色、会议标识、功能标签

为什么要有：

- 多窗口示例需要一种非常轻量的身份标记组件

### [src/renderer/src/pages/HomePage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/HomePage.vue)

作用：

- 展示大厅窗口
- 允许打开新的会议根窗口

为什么要有：

- 把“入口页”和“会议页”分开，架构更清晰

### [src/renderer/src/pages/MeetingPage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/MeetingPage.vue)

作用：

- 展示会议主工作区
- 打开子窗口
- 演示各种共享状态写操作

为什么要有：

- 它是单个会议域的主控制台

### [src/renderer/src/pages/ChildWindowPage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/ChildWindowPage.vue)

作用：

- 展示会议子窗口的通用页面
- 演示子窗口同样可以写共享状态

为什么要有：

- 用最小页面集合证明“多个窗口共同读写一个会议域”这件事

### [src/renderer/src/styles/main.css](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/styles/main.css)

作用：

- 提供全局主题、按钮、网格、卡片和响应式样式

为什么要有：

- 所有窗口需要统一视觉语言
- 共享布局类样式适合放在全局层而不是每个组件里重复写

### [src/renderer/src/env.d.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/env.d.ts)

作用：

- 补充 Vite 和 `.vue` 模块声明

为什么要有：

- TypeScript 默认不认识 Vue 单文件组件模块

### [src/renderer/src/types/global.d.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/types/global.d.ts)

作用：

- 给 `window.electronAPI` 提供全局类型声明

为什么要有：

- 没有它，渲染层拿不到桥接 API 的类型提示

### [src/renderer/index.html](/Users/m/工作/electron-vite-vue3-ts/src/renderer/index.html)

作用：

- 提供渲染层 HTML 外壳和 CSP

为什么要有：

- Vue 应用需要挂载点
- Electron 渲染进程同样需要基础安全策略

## 当前这些功能为什么成立

项目现在能正常实现“多窗口共享一场会议状态”，依赖的是下面这条链路：

1. 大厅窗口请求主进程创建会议窗口。
2. 主进程创建会议域默认快照。
3. 会议窗口启动后拉取自己的窗口上下文和会议快照。
4. 会议窗口再通过 `window.open` 打开子窗口。
5. 主进程接管子窗口创建并登记父子关系。
6. 任一窗口修改共享状态时，请求先发到主进程。
7. 主进程更新快照后，再把结果广播给同一 `meetingId` 的所有窗口。

这条链路存在的原因是：

- 只有主进程能看到所有窗口
- 只有主进程适合做状态唯一真源
- 只有这样，新窗口加入时才有完整快照可读，旧窗口退出时也不会带走全局状态

## 建议阅读顺序

如果你想从头彻底看懂这个项目，建议按下面顺序读：

1. [README.md](/Users/m/工作/electron-vite-vue3-ts/README.md)
2. [src/shared/window.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/window.ts)
3. [src/shared/ipc.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/ipc.ts)
4. [src/shared/meeting.ts](/Users/m/工作/electron-vite-vue3-ts/src/shared/meeting.ts)
5. [electron/main/index.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/index.ts)
6. [electron/main/services/window-registry.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/window-registry.ts)
7. [electron/main/services/meeting-hub.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/meeting-hub.ts)
8. [electron/preload/index.ts](/Users/m/工作/electron-vite-vue3-ts/electron/preload/index.ts)
9. [src/renderer/src/stores/meetingSession.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/stores/meetingSession.ts)
10. [src/renderer/src/pages/MeetingPage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/MeetingPage.vue)
11. [src/renderer/src/pages/ChildWindowPage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/ChildWindowPage.vue)
