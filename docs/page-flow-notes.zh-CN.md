# 页面与流程说明

这份文档不是讲“目录结构”，而是讲“页面是怎么跑起来的”“按钮点下去之后到底发生了什么”。

## 全局启动链路

涉及文件：

- [electron/main/index.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/index.ts)
- [electron/preload/index.ts](/Users/m/工作/electron-vite-vue3-ts/electron/preload/index.ts)
- [src/renderer/src/main.ts](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/main.ts)
- [src/renderer/src/App.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/App.vue)

流程：

1. Electron 启动主进程入口。
2. 主进程初始化 `MeetingHub`。
3. 主进程初始化 `WindowRegistry`。
4. 主进程注册 IPC handler。
5. 主进程创建大厅窗口。
6. 渲染进程启动 Vue 应用。
7. `App.vue` 挂载后调用 `meetingSession.bootstrap()`。
8. store 向主进程请求当前窗口上下文。
9. 如果当前窗口属于某个 `meetingId`，再继续拉取会议快照。
10. store 订阅主进程的状态广播。

为什么要这样分步：

- 先拿窗口上下文，才能知道自己是不是会议窗口
- 先拿快照，后订阅广播，才能保证页面不是从空状态开始猜测

## 页面一：大厅页 `HomePage.vue`

作用：

- 提供应用入口
- 打开新的会议窗口
- 展示这个大厅页本身不参与会议共享状态

页面上的区块：

### 1. 顶部操作按钮

代码位置：

- [HomePage.vue](/Users/m/工作/electron-vite-vue3-ts/src/renderer/src/pages/HomePage.vue)

作用：

- 点击后调用 `createMeeting`

内部流程：

1. 把 `creating` 设为 `true`
2. 调用 `window.electronAPI.shell.createMeetingWindow()`
3. 主进程生成会议窗口
4. 返回 `meetingId`
5. 把 `meetingId` 记录到 `openedMeetings`
6. 最后把 `creating` 设回 `false`

为什么这样设计：

- `creating` 用来防止连续点击开出太多窗口
- `openedMeetings` 用来证明大厅页只记录自己发起过什么，不持有会议状态本体

### 2. 顶部指标区

作用：

- 用三张卡片说明大厅页在架构中的角色

为什么要有：

- 这个项目是示例型脚手架，不只是产品 UI，还需要把架构意图直接展示出来

### 3. 已打开会议列表

作用：

- 展示从大厅打开过的会议 ID

为什么要有：

- 帮助观察“每次点击都会创建新的独立会议域”

### 4. 脚手架能力列表

作用：

- 说明项目已经内建哪些多窗口共享能力

为什么要有：

- 让读代码的人不用先翻源码，也能快速知道边界

## 页面二：会议页 `MeetingPage.vue`

作用：

- 承担单个 `meetingId` 的主工作区
- 打开子窗口
- 演示各种共享状态写操作

它是整个渲染层里最重要的页面。

### 页面初始化时发生什么

前提：

- `App.vue` 已经完成 `meetingSession.bootstrap()`

此时这个页面能直接从 store 拿到：

- `context`
- `snapshot`
- `members`
- `chat`

为什么这样做：

- 页面只消费准备好的窗口会话
- 页面本身不负责重复写 IPC 冷启动逻辑

### 区块一：右上角窗口标签

作用：

- 展示当前 `meetingId`
- 展示当前 `windowId`

为什么要有：

- 这是多窗口示例，窗口身份本身就是重要调试信息

### 区块二：顶部指标区

作用：

- 展示成员数、聊天数、举手数、布局模式

为什么要有：

- 这些值能最快反映共享状态是否真的在变化

### 区块三：打开子窗口

点击一个子窗口按钮后的流程：

1. 调用 `openChild(role)`
2. 读取当前 `meetingId`
3. 调用 `openMeetingChildWindow(meetingId, role)`
4. 先检查该角色子窗口是否已经存在
5. 如果存在则直接聚焦
6. 如果不存在则生成对应路由并执行 `window.open`
7. 主进程拦截并校验 URL
8. 主进程创建原生子窗口并建立父子关系

为什么要有这层工具函数：

- 页面不应该直接重复写 `window.open`
- 同角色子窗口单例化更容易控制行为

### 区块四：共享状态控制区

这里每个按钮都对应一个状态演示动作。

#### `Toggle Layout`

作用：

- 在 `gallery` 和 `speaker` 之间切换布局

为什么要有：

- 布局是最适合演示实时同步的状态

#### `Rotate Spotlight`

作用：

- 修改 `layout.focusParticipantId`

为什么要有：

- 它能证明布局频道不仅有简单布尔值，也有依赖成员列表的指针状态

#### `Toggle Queue Lock`

作用：

- 切换举手队列是否锁定

为什么要有：

- 这是典型主持控制类状态，适合实时广播

#### `Raise Random Hand`

作用：

- 随机挑一个成员举手
- 同时更新 `members` 和 `handRaise`

为什么要有：

- 真实业务中的一次动作常常会修改多个频道，这个按钮就是在演示这种情况

#### `Add Chat Message`

作用：

- 向聊天列表追加一条消息

为什么要有：

- 聊天是典型高频列表更新场景，适合演示批量同步

#### `Push Notice`

作用：

- 往 `shared.notices` 里推入一条新通知

为什么要有：

- 演示普通对象频道也可以选择批量同步

#### `Simulate Member Burst`

作用：

- 一次性制造多位成员状态波动

为什么要有：

- 用来测试 `members` 频道批量同步是否真的起作用

### 区块五：焦点成员区

作用：

- 展示当前焦点成员 ID
- 展示部分成员属性

为什么要有：

- 一边看列表，一边点控制按钮，更容易观察布局和成员频道之间的关系

### 区块六：最近聊天区

作用：

- 展示最近几条消息

为什么要有：

- 最容易观察来自不同窗口的写操作是否已经合并成功

## 页面三：子窗口页 `ChildWindowPage.vue`

作用：

- 作为五类子窗口的通用页面
- 证明子窗口可以读共享状态，也可以写共享状态

### 初始化时发生什么

子窗口本身和会议页一样，也会经过：

1. 读取窗口上下文
2. 拉取会议快照
3. 订阅状态广播

区别只是：

- 它的 `role` 是某个子窗口角色
- 它带有 `parentWindowId`

### 区块一：顶部指标区

作用：

- 展示版本号、固定窗口类型、消息数

为什么要有：

- 这些值能证明子窗口拿到的是会议全局状态，不是自己的局部状态

### 区块二：频道概览

作用：

- 按频道展示当前会议域的数据概览

为什么要有：

- 子窗口不是只看自己的某一块，它实际接入的是整个会议域

### 区块三：子窗口动作

#### `Pin This Window Type`

作用：

- 把当前子窗口角色写入 `layout.pinnedWindow`

为什么要有：

- 用一个非常短的动作证明子窗口也能修改布局类共享状态

#### `Write Shared Chat Update`

作用：

- 从子窗口写入一条聊天消息

为什么要有：

- 聊天是跨窗口最容易看见结果的写操作

## Store：`meetingSession.ts` 在整条链路里干什么

它不是业务状态真源。

它的真正职责是：

- 记录当前窗口上下文
- 保存当前窗口看到的会议快照副本
- 把页面操作转发给主进程
- 接收主进程广播并更新本地副本

为什么要专门有这个 store：

- 如果没有它，每个页面都要自己处理启动、订阅、解绑、更新
- 这些逻辑属于窗口级基础设施，不属于具体页面

## 主进程状态链路

涉及文件：

- [register-ipc.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/ipc/register-ipc.ts)
- [meeting-hub.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/meeting-hub.ts)

当任意窗口发起状态修改时，内部顺序是：

1. 渲染层调用 `meeting.updateState`
2. preload 转发到 IPC
3. `register-ipc.ts` 根据 sender 找到窗口上下文
4. 主进程补上 `sourceWindowId`
5. `MeetingHub.update()` 应用更新
6. 生成新的 `version` 和 `updatedAt`
7. 根据频道规则决定实时广播还是延迟广播
8. 广播发送到同一 `meetingId` 下的所有窗口
9. 各窗口 store 调用 `applyIncoming`
10. 页面响应式刷新

为什么要补 `sourceWindowId`：

- 不能相信渲染层自己声明“我是哪个窗口”
- 这个身份应该由主进程根据 sender 反查得到

## 主进程窗口生命周期链路

涉及文件：

- [window-registry.ts](/Users/m/工作/electron-vite-vue3-ts/electron/main/services/window-registry.ts)

### 会议根窗口关闭时

流程：

1. 监听到 `closed`
2. 找到它登记过的全部子窗口 ID
3. 逐个关闭仍存活的子窗口
4. 触发 `onMeetingClosed(meetingId)`
5. `MeetingHub.destroyMeeting(meetingId)`
6. 清理窗口索引

为什么要这样做：

- 子窗口不应该在父会议结束后单独残留
- 主进程内存中的会议状态也不应该无限累积

### 子窗口关闭时

流程：

1. 监听到 `closed`
2. 从父窗口的 `childWindowIds` 集合中删除自己
3. 从窗口总表里删除自己

为什么要这样做：

- 不及时清理，父窗口会保留无效子窗口引用

## 这份项目里最值得重点理解的三件事

### 1. 主进程是状态真源

这是整个项目成立的前提。

### 2. `meetingId` 是隔离边界

所有广播、快照和窗口归属都围绕它展开。

### 3. `B` 窗口是生命周期锚点

不是所有窗口平权存在。

`B` 窗口负责：

- 打开子窗口
- 承担整场会议的父级角色
- 结束会议生命周期

所以它关闭时，整场会议一起收尾，这不是偶然行为，而是架构设计本身。
