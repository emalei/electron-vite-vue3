import {
  createDefaultMeetingState,
  type MeetingChannel,
  type MeetingChannelChanged,
  type MeetingChannelMap,
  type MeetingChannelUpdate,
  type MeetingStateSnapshot,
  type MeetingSyncRule,
  type MeetingSyncRules
} from '@shared/meeting'

/**
 * 单个会议域在主进程中的运行时容器。
 * 作用：同时保存完整快照、待发送的批处理事件以及对应定时器。
 * 为什么要有：批量同步不是纯数据结构问题，还需要运行时缓冲区和调度句柄。
 */
interface MeetingRuntime {
  snapshot: MeetingStateSnapshot
  pending: Partial<Record<MeetingChannel, MeetingChannelChanged>>
  timers: Partial<Record<MeetingChannel, NodeJS.Timeout>>
}

/**
 * 广播函数签名。
 * 作用：把 MeetingHub 和具体窗口系统解耦。
 * 为什么要有：状态中心只关心“某会议有变更”，不应该知道 Electron 窗口细节。
 */
type Broadcaster = (meetingId: string, payload: MeetingChannelChanged) => void

/**
 * 默认同步规则。
 * 作用：为不同频道定义合理的实时性和吞吐平衡。
 * 为什么要有：成员、聊天这类高频数据若每次都实时广播，窗口多时会产生不必要的抖动。
 */
const defaultRules: MeetingSyncRules = {
  members: { mode: 'batched', waitMs: 120 },
  chat: { mode: 'batched', waitMs: 200 },
  config: { mode: 'realtime' },
  layout: { mode: 'realtime' },
  handRaise: { mode: 'realtime' },
  shared: { mode: 'batched', waitMs: 150 }
}

/**
 * 会议状态中心。
 * 作用：把每个 meetingId 的共享状态和同步策略放在主进程统一托管。
 * 为什么要有：这是多窗口共享状态的核心，否则每个窗口都只能维护自己的局部副本。
 */
export class MeetingHub {
  /** 会议域注册表，key 为 meetingId。 */
  private readonly meetings = new Map<string, MeetingRuntime>()

  constructor(
    /** 广播器由外部注入，方便把状态中心和窗口系统分离。 */
    private readonly broadcast: Broadcaster,
    /** 可覆盖的同步规则，便于后续按业务场景调整节流策略。 */
    private readonly syncRules: MeetingSyncRules = defaultRules
  ) {}

  /**
   * 确保某个会议域存在。
   * 作用：创建或复用会议快照。
   * 为什么要有：窗口在真正写状态前，必须先有一个可落地的会议容器。
   */
  ensureMeeting(meetingId: string, title?: string): MeetingStateSnapshot {
    const existing = this.meetings.get(meetingId)
    if (existing) {
      return existing.snapshot
    }

    const snapshot = createDefaultMeetingState(meetingId, title)
    this.meetings.set(meetingId, {
      snapshot,
      pending: {},
      timers: {}
    })
    return snapshot
  }

  /**
   * 获取会议快照。
   * 作用：给新窗口提供冷启动时的基线状态。
   * 为什么要有：仅靠后续广播不足以恢复当前完整会议状态。
   */
  getSnapshot(meetingId: string): MeetingStateSnapshot | null {
    return this.meetings.get(meetingId)?.snapshot ?? null
  }

  /**
   * 应用一次频道更新。
   * 作用：更新快照版本，并按频道规则决定立即广播还是批处理后广播。
   * 为什么要有：主进程既是状态真源，也是同步调度点。
   */
  update(update: MeetingChannelUpdate): void {
    const runtime = this.ensureRuntime(update.meetingId)
    const currentValue = runtime.snapshot.channels[update.channel]
    const nextValue = this.applyUpdate(currentValue, update)
    const nextVersion = runtime.snapshot.version + 1
    const updatedAt = Date.now()

    // 先落库到快照，再考虑广播，这样新窗口随时拿到的都是最新状态。
    runtime.snapshot = {
      ...runtime.snapshot,
      version: nextVersion,
      updatedAt,
      channels: {
        ...runtime.snapshot.channels,
        [update.channel]: nextValue
      }
    }

    const payload: MeetingChannelChanged = {
      meetingId: update.meetingId,
      channel: update.channel,
      data: nextValue,
      version: nextVersion,
      updatedAt,
      sourceWindowId: update.sourceWindowId
    }

    const rule = this.resolveRule(update.channel, update.mode)
    if (rule.mode === 'realtime') {
      this.broadcast(update.meetingId, payload)
      return
    }

    // 批处理频道只保留该时间窗内的最后一次结果，减少高频窗口抖动。
    runtime.pending[update.channel] = payload
    if (runtime.timers[update.channel]) {
      return
    }

    runtime.timers[update.channel] = setTimeout(() => {
      const pendingPayload = runtime.pending[update.channel]
      if (pendingPayload) {
        this.broadcast(update.meetingId, pendingPayload)
        delete runtime.pending[update.channel]
      }

      // 广播后清理定时器引用，避免会议长时间运行时残留无效句柄。
      const timer = runtime.timers[update.channel]
      if (timer) {
        clearTimeout(timer)
        delete runtime.timers[update.channel]
      }
    }, rule.waitMs ?? 120)
  }

  /**
   * 销毁会议域。
   * 作用：在会议根窗口关闭时释放快照和所有批处理定时器。
   * 为什么要有：会议结束后继续保留状态只会占用内存并制造脏数据。
   */
  destroyMeeting(meetingId: string): void {
    const runtime = this.meetings.get(meetingId)
    if (!runtime) {
      return
    }

    for (const channel of Object.keys(runtime.timers) as MeetingChannel[]) {
      const timer = runtime.timers[channel]
      if (timer) {
        clearTimeout(timer)
      }
    }

    this.meetings.delete(meetingId)
  }

  /**
   * 获取或创建会议运行时。
   * 作用：保证 update 这种写操作永远有合法容器可用。
   * 为什么要有：调用顺序不能强依赖“先创建再写入”，主进程需要具备自愈能力。
   */
  private ensureRuntime(meetingId: string): MeetingRuntime {
    const existing = this.meetings.get(meetingId)
    if (existing) {
      return existing
    }

    const snapshot = createDefaultMeetingState(meetingId)
    const runtime: MeetingRuntime = {
      snapshot,
      pending: {},
      timers: {}
    }
    this.meetings.set(meetingId, runtime)
    return runtime
  }

  /**
   * 把更新负载应用到当前频道值上。
   * 作用：根据 replace / merge 策略生成新值。
   * 为什么要有：不同频道的数据形态不同，统一入口能保证更新行为可预测。
   */
  private applyUpdate<K extends MeetingChannel>(
    currentValue: MeetingChannelMap[K],
    update: MeetingChannelUpdate<K>
  ): MeetingChannelMap[K] {
    // 数组类型默认整体替换，因为列表合并策略往往依赖业务语义，不能盲目浅合并。
    if (update.strategy === 'replace' || Array.isArray(currentValue)) {
      return update.payload as MeetingChannelMap[K]
    }

    if (typeof currentValue === 'object' && currentValue !== null) {
      const currentRecord = currentValue as unknown as Record<string, unknown>
      const nextRecord = update.payload as unknown as Record<string, unknown>

      return {
        ...currentRecord,
        ...nextRecord
      } as unknown as MeetingChannelMap[K]
    }

    return update.payload as MeetingChannelMap[K]
  }

  /**
   * 解析最终同步规则。
   * 作用：优先使用本次更新显式指定的模式，否则退回频道默认规则。
   * 为什么要有：这样既能有全局默认策略，也能允许单次操作覆盖。
   */
  private resolveRule(channel: MeetingChannel, mode?: MeetingSyncRule['mode']): MeetingSyncRule {
    if (mode) {
      return { mode }
    }

    return this.syncRules[channel] ?? { mode: 'realtime' }
  }
}
