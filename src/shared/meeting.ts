import type { ChildWindowRole } from '@shared/window'

/** 状态同步模式：要么实时广播，要么做短时间批处理合并。 */
export type SyncMode = 'realtime' | 'batched'

/** 更新策略：要么整体替换频道值，要么做对象浅合并。 */
export type ApplyStrategy = 'merge' | 'replace'

/**
 * 会议成员模型。
 * 作用：模拟会议里最常见的人物状态，用于演示跨窗口成员信息同步。
 * 为什么要有：成员列表是会议产品里的高频共享数据，适合作为基础示例频道。
 */
export interface Participant {
  id: string
  name: string
  role: 'host' | 'speaker' | 'guest'
  micOn: boolean
  cameraOn: boolean
  handRaised: boolean
  speaking: boolean
}

/**
 * 会议配置频道。
 * 作用：保存会议标题、模式和舞台文案等基础元数据。
 * 为什么要有：这些信息通常由多个窗口共同消费，但改动频率不高，适合单独建模。
 */
export interface MeetingConfigState {
  title: string
  mode: 'meeting' | 'webinar'
  stageLabel: string
  presenterNotes: string
}

/**
 * 布局频道。
 * 作用：描述当前会议展示模式、焦点成员和被固定的子窗口类型。
 * 为什么要有：布局类状态会同时影响主会场和多个子窗口，需要集中同步。
 */
export interface MeetingLayoutState {
  mode: 'gallery' | 'speaker'
  focusParticipantId: string | null
  pinnedWindow: ChildWindowRole | null
}

/**
 * 举手队列频道。
 * 作用：维护当前举手用户顺序以及队列是否锁定。
 * 为什么要有：这类状态需要跨窗口立即一致，否则主持窗口和名册窗口会看到不同结果。
 */
export interface HandRaiseState {
  queue: string[]
  locked: boolean
}

/**
 * 单条聊天消息。
 * 作用：演示列表型共享数据在多窗口中的追加、裁剪和同步。
 * 为什么要有：聊天是典型的高频更新场景，便于测试批量同步策略。
 */
export interface ChatMessage {
  id: string
  sender: string
  content: string
  timestamp: number
}

/**
 * 聊天频道。
 * 作用：保存消息列表以及未读数量。
 * 为什么要有：把聊天相关状态聚合在一个频道里，便于替换或批处理广播。
 */
export interface ChatState {
  messages: ChatMessage[]
  unread: number
}

/**
 * 通用共享信息频道。
 * 作用：承载会议主题、状态和系统通知等跨窗口公共信息。
 * 为什么要有：示例项目需要一个不绑定具体业务细节、但能演示共享状态的频道。
 */
export interface SharedInfoState {
  topic: string
  status: 'idle' | 'live' | 'ending'
  notices: string[]
}

/**
 * 全部会议频道到其数据结构的映射。
 * 作用：作为共享状态协议的核心索引表。
 * 为什么要有：后续所有频道类型推导都基于这张映射表，能显著减少重复定义。
 */
export interface MeetingChannelMap {
  members: Participant[]
  config: MeetingConfigState
  layout: MeetingLayoutState
  handRaise: HandRaiseState
  chat: ChatState
  shared: SharedInfoState
}

/** 频道名联合类型，用于约束更新操作只能命中合法频道。 */
export type MeetingChannel = keyof MeetingChannelMap

/**
 * 某个会议域的完整快照。
 * 作用：让窗口在启动时一次性拿到当前会议全部共享状态。
 * 为什么要有：新开窗口不能只靠增量事件恢复状态，必须先有基准快照。
 */
export interface MeetingStateSnapshot {
  meetingId: string
  version: number
  updatedAt: number
  channels: MeetingChannelMap
}

/**
 * 渲染层发往主进程的频道更新请求。
 * 作用：声明要改哪个频道、改成什么、采用什么同步方式。
 * 为什么要有：主进程需要把“数据内容”和“同步策略”一起接收，才能做统一调度。
 */
export interface MeetingChannelUpdate<K extends MeetingChannel = MeetingChannel> {
  meetingId: string
  channel: K
  strategy?: ApplyStrategy
  payload: MeetingChannelMap[K] | Partial<MeetingChannelMap[K]>
  mode?: SyncMode
  sourceWindowId?: string
}

/**
 * 主进程广播给所有会议窗口的频道变更事件。
 * 作用：告诉订阅方某个频道现在的最新值是什么。
 * 为什么要有：广播最终态而不是操作日志，订阅窗口实现更简单、恢复也更稳。
 */
export interface MeetingChannelChanged<K extends MeetingChannel = MeetingChannel> {
  meetingId: string
  channel: K
  data: MeetingChannelMap[K]
  version: number
  updatedAt: number
  sourceWindowId?: string
}

/**
 * 单个频道的同步规则。
 * 作用：定义该频道采用实时还是批量同步，以及批处理等待时长。
 * 为什么要有：不同频道对时效和吞吐的要求不同，不能一刀切。
 */
export interface MeetingSyncRule {
  mode: SyncMode
  waitMs?: number
}

/** 全量频道同步规则表。 */
export type MeetingSyncRules = Partial<Record<MeetingChannel, MeetingSyncRule>>

/**
 * 频道展示文案。
 * 作用：给 UI 提供稳定的人类可读标题，而不是直接展示内部字段名。
 * 为什么要有：协议字段更偏工程语义，界面展示需要更友好的文案层。
 */
export const meetingChannelLabels: Record<MeetingChannel, string> = {
  members: '成员列表',
  config: '会议配置',
  layout: '布局状态',
  handRaise: '举手队列',
  chat: '聊天消息',
  shared: '共享信息'
}

/**
 * 生成演示用成员列表。
 * 作用：在没有真实后端接入时，为会议域提供可交互的初始成员数据。
 * 为什么要有：示例项目需要开箱即用地展示成员同步和布局切换能力。
 */
export const createDemoParticipants = (count = 12): Participant[] =>
  Array.from({ length: count }, (_, index) => {
    // position 用于稳定生成更接近真实场景的用户编号和展示名。
    const position = index + 1
    return {
      id: `user-${position}`,
      name: `嘉宾 ${position}`,
      role: index === 0 ? 'host' : index < 3 ? 'speaker' : 'guest',
      micOn: index % 2 === 0,
      cameraOn: index % 3 !== 0,
      handRaised: false,
      speaking: index === 1
    }
  })

/**
 * 生成会议默认快照。
 * 作用：为每个新会议域建立第一版状态基线。
 * 为什么要有：主进程只有在拥有初始快照后，才可以安全地接受后续增量更新。
 */
export const createDefaultMeetingState = (meetingId: string, title?: string): MeetingStateSnapshot => ({
  meetingId,
  version: 1,
  updatedAt: Date.now(),
  channels: {
    members: createDemoParticipants(),
    config: {
      title: title ?? `会议 ${meetingId.slice(0, 6)}`,
      mode: 'meeting',
      stageLabel: '主会场',
      presenterNotes: '当前状态由主进程统一共享。'
    },
    layout: {
      mode: 'gallery',
      focusParticipantId: 'user-1',
      pinnedWindow: null
    },
    handRaise: {
      queue: [],
      locked: false
    },
    chat: {
      messages: [
        {
          id: 'msg-1',
          sender: '系统',
          content: '会议工作区已创建。',
          timestamp: Date.now()
        }
      ],
      unread: 0
    },
    shared: {
      topic: '季度协同会议',
      status: 'live',
      notices: ['同步策略由主进程统一控制。']
    }
  }
})
