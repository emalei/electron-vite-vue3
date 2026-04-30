import { BrowserWindow, shell, ipcMain, app } from "electron";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const IPC_CHANNELS = {
  createMeetingWindow: "shell:create-meeting-window",
  getWindowContext: "window:get-context",
  getMeetingSnapshot: "meeting:get-snapshot",
  updateMeetingState: "meeting:update-state",
  meetingStateChanged: "meeting:state-changed"
};
const createDemoParticipants = (count = 12) => Array.from({ length: count }, (_, index) => {
  const position = index + 1;
  return {
    id: `user-${position}`,
    name: `嘉宾 ${position}`,
    role: index === 0 ? "host" : index < 3 ? "speaker" : "guest",
    micOn: index % 2 === 0,
    cameraOn: index % 3 !== 0,
    handRaised: false,
    speaking: index === 1
  };
});
const createDefaultMeetingState = (meetingId, title) => ({
  meetingId,
  version: 1,
  updatedAt: Date.now(),
  channels: {
    members: createDemoParticipants(),
    config: {
      title: title ?? `会议 ${meetingId.slice(0, 6)}`,
      mode: "meeting",
      stageLabel: "主会场",
      presenterNotes: "当前状态由主进程统一共享。"
    },
    layout: {
      mode: "gallery",
      focusParticipantId: "user-1",
      pinnedWindow: null
    },
    handRaise: {
      queue: [],
      locked: false
    },
    chat: {
      messages: [
        {
          id: "msg-1",
          sender: "系统",
          content: "会议工作区已创建。",
          timestamp: Date.now()
        }
      ],
      unread: 0
    },
    shared: {
      topic: "季度协同会议",
      status: "live",
      notices: ["同步策略由主进程统一控制。"]
    }
  }
});
const defaultRules = {
  members: { mode: "batched", waitMs: 120 },
  chat: { mode: "batched", waitMs: 200 },
  config: { mode: "realtime" },
  layout: { mode: "realtime" },
  handRaise: { mode: "realtime" },
  shared: { mode: "batched", waitMs: 150 }
};
class MeetingHub {
  constructor(broadcast, syncRules = defaultRules) {
    this.broadcast = broadcast;
    this.syncRules = syncRules;
  }
  /** 会议域注册表，key 为 meetingId。 */
  meetings = /* @__PURE__ */ new Map();
  /**
   * 确保某个会议域存在。
   * 作用：创建或复用会议快照。
   * 为什么要有：窗口在真正写状态前，必须先有一个可落地的会议容器。
   */
  ensureMeeting(meetingId, title) {
    const existing = this.meetings.get(meetingId);
    if (existing) {
      return existing.snapshot;
    }
    const snapshot = createDefaultMeetingState(meetingId, title);
    this.meetings.set(meetingId, {
      snapshot,
      pending: {},
      timers: {}
    });
    return snapshot;
  }
  /**
   * 获取会议快照。
   * 作用：给新窗口提供冷启动时的基线状态。
   * 为什么要有：仅靠后续广播不足以恢复当前完整会议状态。
   */
  getSnapshot(meetingId) {
    return this.meetings.get(meetingId)?.snapshot ?? null;
  }
  /**
   * 应用一次频道更新。
   * 作用：更新快照版本，并按频道规则决定立即广播还是批处理后广播。
   * 为什么要有：主进程既是状态真源，也是同步调度点。
   */
  update(update) {
    const runtime = this.ensureRuntime(update.meetingId);
    const currentValue = runtime.snapshot.channels[update.channel];
    const nextValue = this.applyUpdate(currentValue, update);
    const nextVersion = runtime.snapshot.version + 1;
    const updatedAt = Date.now();
    runtime.snapshot = {
      ...runtime.snapshot,
      version: nextVersion,
      updatedAt,
      channels: {
        ...runtime.snapshot.channels,
        [update.channel]: nextValue
      }
    };
    const payload = {
      meetingId: update.meetingId,
      channel: update.channel,
      data: nextValue,
      version: nextVersion,
      updatedAt,
      sourceWindowId: update.sourceWindowId
    };
    const rule = this.resolveRule(update.channel, update.mode);
    if (rule.mode === "realtime") {
      this.broadcast(update.meetingId, payload);
      return;
    }
    runtime.pending[update.channel] = payload;
    if (runtime.timers[update.channel]) {
      return;
    }
    runtime.timers[update.channel] = setTimeout(() => {
      const pendingPayload = runtime.pending[update.channel];
      if (pendingPayload) {
        this.broadcast(update.meetingId, pendingPayload);
        delete runtime.pending[update.channel];
      }
      const timer = runtime.timers[update.channel];
      if (timer) {
        clearTimeout(timer);
        delete runtime.timers[update.channel];
      }
    }, rule.waitMs ?? 120);
  }
  /**
   * 销毁会议域。
   * 作用：在会议根窗口关闭时释放快照和所有批处理定时器。
   * 为什么要有：会议结束后继续保留状态只会占用内存并制造脏数据。
   */
  destroyMeeting(meetingId) {
    const runtime = this.meetings.get(meetingId);
    if (!runtime) {
      return;
    }
    for (const channel of Object.keys(runtime.timers)) {
      const timer = runtime.timers[channel];
      if (timer) {
        clearTimeout(timer);
      }
    }
    this.meetings.delete(meetingId);
  }
  /**
   * 获取或创建会议运行时。
   * 作用：保证 update 这种写操作永远有合法容器可用。
   * 为什么要有：调用顺序不能强依赖“先创建再写入”，主进程需要具备自愈能力。
   */
  ensureRuntime(meetingId) {
    const existing = this.meetings.get(meetingId);
    if (existing) {
      return existing;
    }
    const snapshot = createDefaultMeetingState(meetingId);
    const runtime = {
      snapshot,
      pending: {},
      timers: {}
    };
    this.meetings.set(meetingId, runtime);
    return runtime;
  }
  /**
   * 把更新负载应用到当前频道值上。
   * 作用：根据 replace / merge 策略生成新值。
   * 为什么要有：不同频道的数据形态不同，统一入口能保证更新行为可预测。
   */
  applyUpdate(currentValue, update) {
    if (update.strategy === "replace" || Array.isArray(currentValue)) {
      return update.payload;
    }
    if (typeof currentValue === "object" && currentValue !== null) {
      const currentRecord = currentValue;
      const nextRecord = update.payload;
      return {
        ...currentRecord,
        ...nextRecord
      };
    }
    return update.payload;
  }
  /**
   * 解析最终同步规则。
   * 作用：优先使用本次更新显式指定的模式，否则退回频道默认规则。
   * 为什么要有：这样既能有全局默认策略，也能允许单次操作覆盖。
   */
  resolveRule(channel, mode) {
    if (mode) {
      return { mode };
    }
    return this.syncRules[channel] ?? { mode: "realtime" };
  }
}
const childWindowRoles = ["gallery", "spotlight", "roster", "chat", "screen-share"];
const childWindowTitles = {
  gallery: "画廊视图",
  spotlight: "聚焦视图",
  roster: "参会名册",
  chat: "聊天窗口",
  "screen-share": "屏幕共享"
};
class WindowRegistry {
  constructor(options) {
    this.options = options;
  }
  /** 全部窗口的主索引表，key 为 windowId。 */
  windows = /* @__PURE__ */ new Map();
  /**
   * 创建大厅窗口。
   * 作用：作为应用入口，只负责打开新的会议工作区。
   * 为什么要有：大厅窗口不进入具体会议域，可以避免混入实时会议流量。
   */
  createHomeWindow() {
    const descriptor = {
      windowId: this.createWindowId(),
      role: "home",
      title: "会议大厅"
    };
    const window = this.createWindow(descriptor, {
      width: 1320,
      height: 860
    });
    this.loadRendererRoute(window, "/", {});
    return window;
  }
  /**
   * 创建会议根窗口。
   * 作用：承载单个 meetingId 的主工作区，并作为所有子窗口的父级。
   * 为什么要有：这样关闭根窗口时，可以一并清理其子窗口和会议状态。
   */
  createMeetingWindow(input) {
    const descriptor = {
      windowId: this.createWindowId(),
      role: "meeting",
      title: input.title,
      meetingId: input.meetingId
    };
    const window = this.createWindow(descriptor, {
      width: 1480,
      height: 940
    });
    this.loadRendererRoute(window, "/meeting", {
      meetingId: input.meetingId
    });
    return descriptor;
  }
  /**
   * 根据 webContents ID 查窗口上下文。
   * 作用：把渲染层发送来的 IPC 调用回溯到主进程登记的窗口记录。
   * 为什么要有：IPC 只知道 sender，不知道业务层的 windowId 和 meetingId。
   */
  getContextByWebContentsId(webContentsId) {
    for (const record of this.windows.values()) {
      if (record.browserWindow.webContents.id === webContentsId) {
        return record.descriptor;
      }
    }
    return null;
  }
  /**
   * 向某个会议域内全部窗口广播消息。
   * 作用：把状态更新仅发送给同一 meetingId 下的窗口。
   * 为什么要有：不同会议之间必须严格隔离，不能串会。
   */
  broadcastToMeeting(meetingId, channel, payload) {
    for (const record of this.windows.values()) {
      if (record.descriptor.meetingId === meetingId && !record.browserWindow.isDestroyed()) {
        record.browserWindow.webContents.send(channel, payload);
      }
    }
  }
  /**
   * 创建底层 BrowserWindow 并注册生命周期。
   * 作用：封装全部窗口的公共创建逻辑。
   * 为什么要有：大厅、会议根窗口、子窗口共享大量原生配置，集中处理更一致。
   */
  createWindow(descriptor, bounds) {
    const browserWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      minWidth: 1120,
      minHeight: 720,
      title: descriptor.title,
      autoHideMenuBar: true,
      backgroundColor: "#0f172a",
      webPreferences: {
        preload: this.options.preloadPath,
        contextIsolation: true,
        sandbox: false
      }
    });
    this.windows.set(descriptor.windowId, {
      descriptor,
      browserWindow,
      childWindowIds: /* @__PURE__ */ new Set()
    });
    browserWindow.webContents.setWindowOpenHandler(({ url }) => {
      const parsed = this.parseRendererUrl(url);
      if (!parsed) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
          shell.openExternal(url);
        }
        return { action: "deny" };
      }
      if (descriptor.meetingId !== parsed.meetingId || !childWindowRoles.includes(parsed.role)) {
        return { action: "deny" };
      }
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 980,
          height: 760,
          autoHideMenuBar: true,
          title: childWindowTitles[parsed.role],
          backgroundColor: "#0f172a",
          webPreferences: {
            preload: this.options.preloadPath,
            contextIsolation: true,
            sandbox: false
          }
        }
      };
    });
    browserWindow.webContents.on("did-create-window", (childWindow, details) => {
      const parsed = this.parseRendererUrl(details.url);
      if (!parsed || !descriptor.meetingId || parsed.meetingId !== descriptor.meetingId) {
        childWindow.close();
        return;
      }
      const parentRecord = this.findMeetingRoot(descriptor.meetingId);
      if (!parentRecord) {
        childWindow.close();
        return;
      }
      const childDescriptor = {
        windowId: this.createWindowId(),
        role: parsed.role,
        title: childWindowTitles[parsed.role],
        meetingId: parsed.meetingId,
        parentWindowId: parentRecord.descriptor.windowId
      };
      this.windows.set(childDescriptor.windowId, {
        descriptor: childDescriptor,
        browserWindow: childWindow,
        childWindowIds: /* @__PURE__ */ new Set()
      });
      parentRecord.childWindowIds.add(childDescriptor.windowId);
      childWindow.setTitle(childDescriptor.title);
      this.attachLifecycle(childWindow, childDescriptor);
    });
    this.attachLifecycle(browserWindow, descriptor);
    return browserWindow;
  }
  /**
   * 绑定窗口关闭生命周期。
   * 作用：在窗口销毁时同步清理索引、父子引用和会议状态。
   * 为什么要有：窗口关闭是多窗口应用最容易产生脏引用的地方，必须集中兜底。
   */
  attachLifecycle(window, descriptor) {
    window.on("closed", () => {
      const record = this.windows.get(descriptor.windowId);
      if (!record) {
        return;
      }
      if (descriptor.role === "meeting" && descriptor.meetingId) {
        for (const childWindowId of record.childWindowIds) {
          const childRecord = this.windows.get(childWindowId);
          if (childRecord && !childRecord.browserWindow.isDestroyed()) {
            childRecord.browserWindow.close();
          }
        }
        this.options.onMeetingClosed(descriptor.meetingId);
      }
      if (descriptor.parentWindowId) {
        const parentRecord = this.windows.get(descriptor.parentWindowId);
        parentRecord?.childWindowIds.delete(descriptor.windowId);
      }
      this.windows.delete(descriptor.windowId);
    });
  }
  /**
   * 把逻辑路由加载到 Electron 窗口。
   * 作用：兼容开发环境的 Vite URL 和生产环境的打包 HTML 文件。
   * 为什么要有：Electron 开发态和构建态的入口形态不同，必须在主进程统一适配。
   */
  loadRendererRoute(browserWindow, routePath, query) {
    const search = new URLSearchParams(query);
    const hash = `${routePath}${search.size > 0 ? `?${search.toString()}` : ""}`;
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
      browserWindow.loadURL(`${rendererUrl}#${hash}`);
      return;
    }
    const indexHtmlPath = fileURLToPath(new URL("../../../out/renderer/index.html", import.meta.url));
    browserWindow.loadFile(indexHtmlPath, {
      hash
    });
  }
  /**
   * 解析渲染层 URL 是否指向合法子窗口。
   * 作用：从 window.open 的目标地址中还原窗口角色和会议 ID。
   * 为什么要有：主进程需要在真正放行创建之前做权限校验。
   */
  parseRendererUrl(url) {
    const parsedUrl = new URL(url);
    const rawHash = parsedUrl.hash.replace(/^#/, "");
    const [routePath, queryString = ""] = rawHash.split("?");
    const query = new URLSearchParams(queryString);
    const meetingId = query.get("meetingId");
    if (!meetingId) {
      return null;
    }
    const childRole = routePath.replace("/child/", "");
    if (!childWindowRoles.includes(childRole)) {
      return null;
    }
    return {
      role: childRole,
      meetingId
    };
  }
  /**
   * 查找某个会议域的根窗口记录。
   * 作用：把新创建的子窗口挂接到正确的会议父节点下。
   * 为什么要有：只有根窗口才拥有关闭整场会议的权限和责任。
   */
  findMeetingRoot(meetingId) {
    for (const record of this.windows.values()) {
      if (record.descriptor.meetingId === meetingId && record.descriptor.role === "meeting") {
        return record;
      }
    }
    return null;
  }
  /**
   * 生成业务层窗口 ID。
   * 作用：避免直接复用 Electron 内部 ID，保持协议层标识稳定、独立。
   * 为什么要有：业务 ID 不应该依赖底层实现细节，后续切换策略也更容易。
   */
  createWindowId() {
    return randomUUID();
  }
}
const registerIpcHandlers = (windowRegistry2, meetingHub2) => {
  ipcMain.handle(
    IPC_CHANNELS.createMeetingWindow,
    (_event, payload) => {
      const meetingId = payload?.meetingId ?? crypto.randomUUID();
      const title = payload?.title ?? `会议 ${meetingId.slice(0, 6)}`;
      meetingHub2.ensureMeeting(meetingId, title);
      const descriptor = windowRegistry2.createMeetingWindow({ meetingId, title });
      return {
        meetingId,
        windowId: descriptor.windowId
      };
    }
  );
  ipcMain.handle(IPC_CHANNELS.getWindowContext, (event) => {
    if (!BrowserWindow.fromWebContents(event.sender)) {
      throw new Error("Unable to resolve BrowserWindow from sender.");
    }
    const context = windowRegistry2.getContextByWebContentsId(event.sender.id);
    if (!context) {
      throw new Error("Window context not found.");
    }
    return context;
  });
  ipcMain.handle(IPC_CHANNELS.getMeetingSnapshot, (_event, meetingId) => {
    return meetingHub2.getSnapshot(meetingId);
  });
  ipcMain.handle(IPC_CHANNELS.updateMeetingState, (event, payload) => {
    const context = windowRegistry2.getContextByWebContentsId(event.sender.id);
    meetingHub2.update({
      ...payload,
      sourceWindowId: context?.windowId
    });
  });
};
const preloadPath = fileURLToPath(new URL("../preload/index.mjs", import.meta.url));
let windowRegistry = null;
let meetingHub = null;
const bootstrap = async () => {
  await app.whenReady();
  meetingHub = new MeetingHub((meetingId, payload) => {
    windowRegistry?.broadcastToMeeting(meetingId, IPC_CHANNELS.meetingStateChanged, payload);
  });
  windowRegistry = new WindowRegistry({
    preloadPath,
    onMeetingClosed: (meetingId) => {
      meetingHub?.destroyMeeting(meetingId);
    }
  });
  registerIpcHandlers(windowRegistry, meetingHub);
  windowRegistry.createHomeWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowRegistry?.createHomeWindow();
    }
  });
};
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
bootstrap();
