import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { BrowserWindow, shell } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'
import { childWindowRoles, childWindowTitles, type WindowDescriptor } from '@shared/window'

/**
 * 主进程中的窗口记录。
 * 作用：把窗口描述对象、原生窗口实例以及子窗口关联关系放在一起管理。
 * 为什么要有：只有这样，主进程才能既查到元信息，又能执行关闭、广播等原生操作。
 */
interface WindowRecord {
  descriptor: WindowDescriptor
  browserWindow: BrowserWindow
  childWindowIds: Set<string>
}

/**
 * 窗口注册表配置。
 * 作用：把运行时需要的外部能力通过构造参数注入进来。
 * 为什么要有：减少类内部对全局环境的硬编码，方便后续扩展和测试。
 */
interface WindowRegistryOptions {
  preloadPath: string
  onMeetingClosed: (meetingId: string) => void
}

/**
 * 创建会议根窗口所需输入。
 * 作用：限制创建会议窗口时真正需要的最小参数集合。
 * 为什么要有：避免把完整 WindowDescriptor 暴露给调用者，减少误用。
 */
interface CreateMeetingWindowInput {
  meetingId: string
  title: string
}

/**
 * 多窗口注册中心。
 * 作用：统一管理全部 BrowserWindow 的创建、上下文查询、广播和销毁联动。
 * 为什么要有：Electron 多窗口一旦分散管理，很快就会出现引用丢失和生命周期失控。
 */
export class WindowRegistry {
  /** 全部窗口的主索引表，key 为 windowId。 */
  private readonly windows = new Map<string, WindowRecord>()

  constructor(private readonly options: WindowRegistryOptions) {}

  /**
   * 创建大厅窗口。
   * 作用：作为应用入口，只负责打开新的会议工作区。
   * 为什么要有：大厅窗口不进入具体会议域，可以避免混入实时会议流量。
   */
  createHomeWindow(): BrowserWindow {
    const descriptor: WindowDescriptor = {
      windowId: this.createWindowId(),
      role: 'home',
      title: '会议大厅'
    }

    const window = this.createWindow(descriptor, {
      width: 1320,
      height: 860
    })
    this.loadRendererRoute(window, '/', {})
    return window
  }

  /**
   * 创建会议根窗口。
   * 作用：承载单个 meetingId 的主工作区，并作为所有子窗口的父级。
   * 为什么要有：这样关闭根窗口时，可以一并清理其子窗口和会议状态。
   */
  createMeetingWindow(input: CreateMeetingWindowInput): WindowDescriptor {
    const descriptor: WindowDescriptor = {
      windowId: this.createWindowId(),
      role: 'meeting',
      title: input.title,
      meetingId: input.meetingId
    }

    const window = this.createWindow(descriptor, {
      width: 1480,
      height: 940
    })
    this.loadRendererRoute(window, '/meeting', {
      meetingId: input.meetingId
    })
    return descriptor
  }

  /**
   * 根据 webContents ID 查窗口上下文。
   * 作用：把渲染层发送来的 IPC 调用回溯到主进程登记的窗口记录。
   * 为什么要有：IPC 只知道 sender，不知道业务层的 windowId 和 meetingId。
   */
  getContextByWebContentsId(webContentsId: number): WindowDescriptor | null {
    for (const record of this.windows.values()) {
      if (record.browserWindow.webContents.id === webContentsId) {
        return record.descriptor
      }
    }

    return null
  }

  /**
   * 向某个会议域内全部窗口广播消息。
   * 作用：把状态更新仅发送给同一 meetingId 下的窗口。
   * 为什么要有：不同会议之间必须严格隔离，不能串会。
   */
  broadcastToMeeting(meetingId: string, channel: string, payload: unknown): void {
    for (const record of this.windows.values()) {
      if (record.descriptor.meetingId === meetingId && !record.browserWindow.isDestroyed()) {
        record.browserWindow.webContents.send(channel, payload)
      }
    }
  }

  /**
   * 创建底层 BrowserWindow 并注册生命周期。
   * 作用：封装全部窗口的公共创建逻辑。
   * 为什么要有：大厅、会议根窗口、子窗口共享大量原生配置，集中处理更一致。
   */
  private createWindow(
    descriptor: WindowDescriptor,
    bounds: Pick<BrowserWindowConstructorOptions, 'width' | 'height'>
  ): BrowserWindow {
    const browserWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      minWidth: 1120,
      minHeight: 720,
      title: descriptor.title,
      autoHideMenuBar: true,
      backgroundColor: '#0f172a',
      webPreferences: {
        preload: this.options.preloadPath,
        contextIsolation: true,
        sandbox: false
      }
    })

    this.windows.set(descriptor.windowId, {
      descriptor,
      browserWindow,
      childWindowIds: new Set()
    })

    browserWindow.webContents.setWindowOpenHandler(({ url }) => {
      // 只允许打开应用内部认可的会议子窗口，外链统一转交系统浏览器。
      const parsed = this.parseRendererUrl(url)
      if (!parsed) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          shell.openExternal(url)
        }
        return { action: 'deny' }
      }

      // 子窗口必须属于同一个会议域，并且角色在白名单中。
      if (descriptor.meetingId !== parsed.meetingId || !childWindowRoles.includes(parsed.role)) {
        return { action: 'deny' }
      }

      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 980,
          height: 760,
          autoHideMenuBar: true,
          title: childWindowTitles[parsed.role],
          backgroundColor: '#0f172a',
          webPreferences: {
            preload: this.options.preloadPath,
            contextIsolation: true,
            sandbox: false
          }
        }
      }
    })

    browserWindow.webContents.on('did-create-window', (childWindow, details) => {
      // 真正的子窗口创建后，再补齐主进程侧的业务上下文和父子关系。
      const parsed = this.parseRendererUrl(details.url)
      if (!parsed || !descriptor.meetingId || parsed.meetingId !== descriptor.meetingId) {
        childWindow.close()
        return
      }

      const parentRecord = this.findMeetingRoot(descriptor.meetingId)
      if (!parentRecord) {
        childWindow.close()
        return
      }

      const childDescriptor: WindowDescriptor = {
        windowId: this.createWindowId(),
        role: parsed.role,
        title: childWindowTitles[parsed.role],
        meetingId: parsed.meetingId,
        parentWindowId: parentRecord.descriptor.windowId
      }

      this.windows.set(childDescriptor.windowId, {
        descriptor: childDescriptor,
        browserWindow: childWindow,
        childWindowIds: new Set()
      })

      parentRecord.childWindowIds.add(childDescriptor.windowId)
      childWindow.setTitle(childDescriptor.title)
      this.attachLifecycle(childWindow, childDescriptor)
    })

    this.attachLifecycle(browserWindow, descriptor)
    return browserWindow
  }

  /**
   * 绑定窗口关闭生命周期。
   * 作用：在窗口销毁时同步清理索引、父子引用和会议状态。
   * 为什么要有：窗口关闭是多窗口应用最容易产生脏引用的地方，必须集中兜底。
   */
  private attachLifecycle(window: BrowserWindow, descriptor: WindowDescriptor): void {
    window.on('closed', () => {
      const record = this.windows.get(descriptor.windowId)
      if (!record) {
        return
      }

      if (descriptor.role === 'meeting' && descriptor.meetingId) {
        // 会议根窗口关闭时，所有附属子窗口都应该一起退出，避免留下孤儿窗口。
        for (const childWindowId of record.childWindowIds) {
          const childRecord = this.windows.get(childWindowId)
          if (childRecord && !childRecord.browserWindow.isDestroyed()) {
            childRecord.browserWindow.close()
          }
        }
        this.options.onMeetingClosed(descriptor.meetingId)
      }

      if (descriptor.parentWindowId) {
        const parentRecord = this.windows.get(descriptor.parentWindowId)
        parentRecord?.childWindowIds.delete(descriptor.windowId)
      }

      this.windows.delete(descriptor.windowId)
    })
  }

  /**
   * 把逻辑路由加载到 Electron 窗口。
   * 作用：兼容开发环境的 Vite URL 和生产环境的打包 HTML 文件。
   * 为什么要有：Electron 开发态和构建态的入口形态不同，必须在主进程统一适配。
   */
  private loadRendererRoute(
    browserWindow: BrowserWindow,
    routePath: string,
    query: Record<string, string>
  ): void {
    // Hash 路由更适合 Electron 的 file:// 场景，不依赖服务端路由回退。
    const search = new URLSearchParams(query)
    const hash = `${routePath}${search.size > 0 ? `?${search.toString()}` : ''}`
    const rendererUrl = process.env.ELECTRON_RENDERER_URL

    if (rendererUrl) {
      browserWindow.loadURL(`${rendererUrl}#${hash}`)
      return
    }

    const indexHtmlPath = fileURLToPath(new URL('../../../out/renderer/index.html', import.meta.url))
    browserWindow.loadFile(indexHtmlPath, {
      hash
    })
  }

  /**
   * 解析渲染层 URL 是否指向合法子窗口。
   * 作用：从 window.open 的目标地址中还原窗口角色和会议 ID。
   * 为什么要有：主进程需要在真正放行创建之前做权限校验。
   */
  private parseRendererUrl(url: string): { role: (typeof childWindowRoles)[number]; meetingId: string } | null {
    const parsedUrl = new URL(url)
    const rawHash = parsedUrl.hash.replace(/^#/, '')
    const [routePath, queryString = ''] = rawHash.split('?')
    const query = new URLSearchParams(queryString)
    const meetingId = query.get('meetingId')

    if (!meetingId) {
      return null
    }

    const childRole = routePath.replace('/child/', '')
    if (!childWindowRoles.includes(childRole as (typeof childWindowRoles)[number])) {
      return null
    }

    return {
      role: childRole as (typeof childWindowRoles)[number],
      meetingId
    }
  }

  /**
   * 查找某个会议域的根窗口记录。
   * 作用：把新创建的子窗口挂接到正确的会议父节点下。
   * 为什么要有：只有根窗口才拥有关闭整场会议的权限和责任。
   */
  private findMeetingRoot(meetingId: string): WindowRecord | null {
    for (const record of this.windows.values()) {
      if (record.descriptor.meetingId === meetingId && record.descriptor.role === 'meeting') {
        return record
      }
    }

    return null
  }

  /**
   * 生成业务层窗口 ID。
   * 作用：避免直接复用 Electron 内部 ID，保持协议层标识稳定、独立。
   * 为什么要有：业务 ID 不应该依赖底层实现细节，后续切换策略也更容易。
   */
  private createWindowId(): string {
    return randomUUID()
  }
}
