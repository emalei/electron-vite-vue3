# 中文文档导航

这页是整个项目中文文档的总入口。

如果你不想在多个文档之间来回跳，可以先看这页，再按目标进入对应文档。

## 先看哪一份

### 想先恢复上次会话上下文

看：

- [session-handoff.zh-CN.md](/Users/m/工作/electron/docs/session-handoff.zh-CN.md)

适合场景：

- 重新打开终端
- 重新进入项目
- 不想从头解释这次已经做过什么
- 想让新会话快速接上旧会话

### 想先快速知道项目是做什么的

看：

- [README.zh-CN.md](/Users/m/工作/electron/README.zh-CN.md)

适合场景：

- 第一次打开这个仓库
- 只想快速知道项目目标、能力和目录结构
- 还不打算深入读源码

### 想按模块理解整个架构

看：

- [project-architecture-notes.zh-CN.md](/Users/m/工作/electron/docs/project-architecture-notes.zh-CN.md)

适合场景：

- 想知道为什么状态放在主进程
- 想知道为什么要有 `MeetingHub`、`WindowRegistry`、`preload`
- 想按文件理解每层职责

### 想知道页面和按钮点击后会发生什么

看：

- [page-flow-notes.zh-CN.md](/Users/m/工作/electron/docs/page-flow-notes.zh-CN.md)

适合场景：

- 想按页面理解业务流程
- 想知道大厅页、会议页、子窗口页分别做什么
- 想知道 store 在页面交互中承担什么角色

### 想按调用顺序看整条链路

看：

- [sequence-diagrams.zh-CN.md](/Users/m/工作/electron/docs/sequence-diagrams.zh-CN.md)

适合场景：

- 想确认谁先调用谁
- 想看 A、B、Child、preload、main 之间的先后关系
- 想看时序图而不是概念说明

## 推荐阅读路径

### 路径一：第一次读这个项目

1. [README.zh-CN.md](/Users/m/工作/electron/README.zh-CN.md)
2. [project-architecture-notes.zh-CN.md](/Users/m/工作/electron/docs/project-architecture-notes.zh-CN.md)
3. [page-flow-notes.zh-CN.md](/Users/m/工作/electron/docs/page-flow-notes.zh-CN.md)
4. [sequence-diagrams.zh-CN.md](/Users/m/工作/electron/docs/sequence-diagrams.zh-CN.md)

为什么这样排：

- 先知道项目目的
- 再知道架构为什么这样拆
- 再知道页面怎么流转
- 最后再用时序图把调用顺序彻底串起来

### 路径二：准备开始改代码

1. [project-architecture-notes.zh-CN.md](/Users/m/工作/electron/docs/project-architecture-notes.zh-CN.md)
2. [sequence-diagrams.zh-CN.md](/Users/m/工作/electron/docs/sequence-diagrams.zh-CN.md)
3. [page-flow-notes.zh-CN.md](/Users/m/工作/electron/docs/page-flow-notes.zh-CN.md)

为什么这样排：

- 先明确边界和职责
- 再确认真实调用链路
- 最后回到页面交互细节

### 路径三：只想快速定位某个问题

如果你的问题是这些，优先看这里：

- “为什么这个状态要放主进程？” -> [project-architecture-notes.zh-CN.md](/Users/m/工作/electron/docs/project-architecture-notes.zh-CN.md)
- “这个按钮点了之后调用顺序是什么？” -> [sequence-diagrams.zh-CN.md](/Users/m/工作/electron/docs/sequence-diagrams.zh-CN.md)
- “这个页面到底负责什么？” -> [page-flow-notes.zh-CN.md](/Users/m/工作/electron/docs/page-flow-notes.zh-CN.md)
- “这个仓库整体是干嘛的？” -> [README.zh-CN.md](/Users/m/工作/electron/README.zh-CN.md)

## 对照源码怎么读

如果你想一边看文档一边看源码，推荐按下面顺序打开文件：

1. [src/shared/window.ts](/Users/m/工作/electron/src/shared/window.ts)
2. [src/shared/ipc.ts](/Users/m/工作/electron/src/shared/ipc.ts)
3. [src/shared/meeting.ts](/Users/m/工作/electron/src/shared/meeting.ts)
4. [electron/main/index.ts](/Users/m/工作/electron/electron/main/index.ts)
5. [electron/main/services/window-registry.ts](/Users/m/工作/electron/electron/main/services/window-registry.ts)
6. [electron/main/services/meeting-hub.ts](/Users/m/工作/electron/electron/main/services/meeting-hub.ts)
7. [electron/preload/index.ts](/Users/m/工作/electron/electron/preload/index.ts)
8. [src/renderer/src/stores/meetingSession.ts](/Users/m/工作/electron/src/renderer/src/stores/meetingSession.ts)
9. [src/renderer/src/pages/HomePage.vue](/Users/m/工作/electron/src/renderer/src/pages/HomePage.vue)
10. [src/renderer/src/pages/MeetingPage.vue](/Users/m/工作/electron/src/renderer/src/pages/MeetingPage.vue)
11. [src/renderer/src/pages/ChildWindowPage.vue](/Users/m/工作/electron/src/renderer/src/pages/ChildWindowPage.vue)

## 当前中文文档清单

- [README.zh-CN.md](/Users/m/工作/electron/README.zh-CN.md)
- [index.zh-CN.md](/Users/m/工作/electron/docs/index.zh-CN.md)
- [session-handoff.zh-CN.md](/Users/m/工作/electron/docs/session-handoff.zh-CN.md)
- [project-architecture-notes.zh-CN.md](/Users/m/工作/electron/docs/project-architecture-notes.zh-CN.md)
- [page-flow-notes.zh-CN.md](/Users/m/工作/electron/docs/page-flow-notes.zh-CN.md)
- [sequence-diagrams.zh-CN.md](/Users/m/工作/electron/docs/sequence-diagrams.zh-CN.md)

## 这页存在的意义

前面几份文档已经分别解释了：

- 项目目标
- 架构分层
- 页面流程
- 时序调用

这页存在的原因不是重复内容，而是减少“我现在到底该先看哪份”的成本。
