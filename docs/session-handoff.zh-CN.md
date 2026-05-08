# 会话交接说明

这份文件的目标只有一个：

下次重新打开终端、重新进入这个项目时，让新会话能最快恢复上下文。

## 协作规则

从这次开始，约定如下：

- 以后每次有实质变化，就自动更新 [docs/session-handoff.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/session-handoff.zh-CN.md)

这里的“实质变化”包括：

- 改了代码
- 改了文档
- 确认了新的架构结论
- 确认了新的约束、约定或边界
- 明确了下一步优先事项

这里的“实质变化”通常不包括：

- 单纯闲聊
- 纯临时性中间思路
- 尚未验证、随后可能被推翻的猜测

## 本次已经完成的工作

### 1. 给源码补了详细注释

已经覆盖：

- 主进程代码
- preload 桥接代码
- 共享类型与 IPC 协议
- Pinia store
- 页面交互函数
- 全局样式与组件样式
- 构建、TS、ESLint、Prettier 配置

注释不只是解释“这行代码干什么”，还解释了：

- 当前功能的作用
- 为什么要这样设计
- 这一层在整个多窗口架构里的职责

### 2. 补了中文文档体系

当前已有文档：

- [docs/index.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/index.zh-CN.md)
- [README.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/README.zh-CN.md)
- [project-architecture-notes.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/project-architecture-notes.zh-CN.md)
- [page-flow-notes.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/page-flow-notes.zh-CN.md)
- [sequence-diagrams.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/sequence-diagrams.zh-CN.md)

### 3. 做过静态验证

已通过：

- `npm run typecheck`
- `npm run lint`

### 4. 页面可见英文已改为中文

这次已经把用户可见的主要英文文案统一替换为中文，覆盖了：

- 大厅页
- 会议页
- 子窗口页
- 子窗口标题
- 默认会议标题
- 默认演示消息和频道展示文案
- 页面 HTML 标题

处理方式不是修改内部协议枚举，而是：

- 保留内部角色和状态枚举的英文值，避免影响逻辑
- 对页面展示层增加中文映射
- 对真正用户可见的默认文本直接改成中文

## 当前项目状态

这是一个 Electron 多窗口会议脚手架。

当前核心能力已经明确：

- 大厅窗口 `A`
- 会议根窗口 `B`
- 子窗口 `gallery` / `spotlight` / `roster` / `chat` / `screen-share`
- 共享会议状态统一放在主进程
- 每个会议通过 `meetingId` 隔离
- 同一会议下多个窗口共享同一份状态
- 支持实时同步和批量同步两类频道策略
- `B` 窗口关闭时自动关闭所有子窗口并销毁会议状态

## 下次进入项目时，应该先看什么

推荐最短恢复路径：

1. [docs/index.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/index.zh-CN.md)
2. [docs/session-handoff.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/session-handoff.zh-CN.md)
3. [project-architecture-notes.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/project-architecture-notes.zh-CN.md)

如果想连页面和调用顺序一起恢复，再继续看：

4. [page-flow-notes.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/page-flow-notes.zh-CN.md)
5. [sequence-diagrams.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/sequence-diagrams.zh-CN.md)

## 下次对助手可以直接说什么

最推荐直接说这句：

```text
先看 docs/index.zh-CN.md 和 docs/session-handoff.zh-CN.md，然后继续这个项目
```

如果你准备直接改代码，可以说：

```text
先看 docs/session-handoff.zh-CN.md、docs/sequence-diagrams.zh-CN.md，再继续实现
```

如果你只是想继续读懂代码，可以说：

```text
先看 docs/session-handoff.zh-CN.md，然后带我继续看这个项目
```

## 这次会话形成的几个关键共识

### 1. 不依赖助手的长期记忆

处理方式是：

- 把知识沉淀到仓库文档
- 把设计原因写进注释
- 让下次会话从仓库恢复上下文

### 2. 主进程是共享状态真源

这是当前项目最核心的架构前提。

不要轻易改成：

- 某个渲染窗口持有全局状态
- 多个窗口各自维护一份独立会议状态

### 3. `meetingId` 是隔离边界

不要轻易破坏：

- 广播按 `meetingId` 过滤
- 快照按 `meetingId` 获取
- 子窗口必须归属于某个已有会议根窗口

### 4. `B` 窗口是会议生命周期锚点

不要轻易改掉这个规则：

- 关闭 `B` 时必须关闭子窗口
- 关闭 `B` 时必须销毁该会议状态

## 如果下次要继续开发，优先方向可以是什么

可选方向一：接入真实业务

- 接 RTC SDK
- 接真实参会人数据
- 接真实聊天消息源

可选方向二：增强架构

- 持久化会议状态
- 恢复已打开会议
- 给不同频道增加更细同步策略

可选方向三：增强界面

- 让不同子窗口展示真正不同的内容
- 增加更多会议控制区
- 补更完整的状态可视化

## 如果下次只剩几分钟，最低限度看哪份

只看这两份就够恢复大部分上下文：

- [docs/session-handoff.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/session-handoff.zh-CN.md)
- [docs/index.zh-CN.md](/Users/m/工作/electron-vite-vue3-ts/docs/index.zh-CN.md)

## 这份文件为什么单独存在

前面的文档分别解决的是：

- README：项目是什么
- 架构文档：为什么这样拆
- 页面文档：页面怎么流转
- 时序图：谁先调谁

而这份文件解决的是另一个问题：

- 下次重新开会话时，怎么最快续上这次的工作
