import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  MeetingChannel,
  MeetingChannelChanged,
  MeetingChannelMap,
  MeetingChannelUpdate,
  MeetingStateSnapshot
} from '@shared/meeting'
import type { WindowContext } from '@shared/ipc'

/**
 * 当前 Electron 窗口对应的会话 store。
 * 作用：管理窗口上下文、会议快照和主进程广播订阅。
 * 为什么要有：每个窗口都需要同一套启动、读快照、写频道和销毁订阅的流程。
 */
export const useMeetingSessionStore = defineStore('meeting-session', () => {
  /** 当前窗口的主进程上下文，例如 windowId、role、meetingId。 */
  const context = ref<WindowContext | null>(null)
  /** 当前会议域快照。大厅窗口没有 meetingId，因此可能为空。 */
  const snapshot = ref<MeetingStateSnapshot | null>(null)
  /** 标记 bootstrap 是否已经完成，避免重复初始化。 */
  const ready = ref(false)
  /** 取消订阅函数，用于窗口卸载或重置时释放 IPC 监听。 */
  let unsubscribe: (() => void) | null = null

  /**
   * 当前窗口是否属于某个会议域。
   * 作用：让页面快速判断是否应该展示或写入会议共享状态。
   * 为什么要有：大厅窗口和会议窗口复用同一 store，但职责不同。
   */
  const isMeetingScoped = computed(() => Boolean(context.value?.meetingId))

  /**
   * 冷启动当前窗口会话。
   * 作用：读取窗口上下文、拉取会议快照并开始订阅主进程广播。
   * 为什么要有：如果没有这个统一启动动作，页面很容易在上下文尚未就绪时读到空状态。
   */
  const bootstrap = async (): Promise<void> => {
    if (ready.value) {
      return
    }

    context.value = await window.electronAPI.window.getContext()

    if (context.value.meetingId) {
      snapshot.value = await window.electronAPI.meeting.getSnapshot(context.value.meetingId)
    }

    unsubscribe = window.electronAPI.meeting.onStateChanged((payload) => {
      // 每个窗口只消费自己所属 meetingId 的广播，防止不同会议状态串流。
      if (payload.meetingId !== context.value?.meetingId) {
        return
      }

      applyIncoming(payload)
    })

    ready.value = true
  }

  /**
   * 应用主进程推送的增量变更。
   * 作用：把广播事件并入当前窗口本地快照。
   * 为什么要有：渲染层只保存副本，不自行推导状态，始终以主进程广播为准。
   */
  const applyIncoming = <K extends MeetingChannel>(payload: MeetingChannelChanged<K>): void => {
    if (!snapshot.value) {
      return
    }

    snapshot.value = {
      ...snapshot.value,
      version: payload.version,
      updatedAt: payload.updatedAt,
      channels: {
        ...snapshot.value.channels,
        [payload.channel]: payload.data
      }
    }
  }

  /**
   * 更新单个频道。
   * 作用：把修改请求转发给主进程，由主进程决定最终版本号和广播策略。
   * 为什么要有：共享状态不能在任意窗口本地直接改，否则窗口之间会立刻分叉。
   */
  const updateChannel = async <K extends MeetingChannel>(
    channel: K,
    payload: MeetingChannelUpdate<K>['payload'],
    strategy: MeetingChannelUpdate<K>['strategy'] = 'merge',
    mode?: MeetingChannelUpdate<K>['mode']
  ): Promise<void> => {
    if (!context.value?.meetingId) {
      return
    }

    await window.electronAPI.meeting.updateState({
      meetingId: context.value.meetingId,
      channel,
      payload,
      strategy,
      mode
    })
  }

  /**
   * 整体替换某个频道。
   * 作用：为数组或完整对象重建场景提供更明确的语义入口。
   * 为什么要有：调用方不必每次都显式传入 replace 字符串，减少样板代码。
   */
  const replaceChannel = async <K extends MeetingChannel>(
    channel: K,
    value: MeetingChannelMap[K],
    mode?: MeetingChannelUpdate<K>['mode']
  ): Promise<void> => {
    await updateChannel(channel, value, 'replace', mode)
  }

  /**
   * 重置窗口会话。
   * 作用：释放广播订阅并清空本地上下文与快照。
   * 为什么要有：窗口销毁、热重载或未来切换会议域时都需要一个明确的清理入口。
   */
  const reset = (): void => {
    unsubscribe?.()
    unsubscribe = null
    ready.value = false
    context.value = null
    snapshot.value = null
  }

  return {
    context,
    snapshot,
    ready,
    isMeetingScoped,
    bootstrap,
    updateChannel,
    replaceChannel,
    reset
  }
})
