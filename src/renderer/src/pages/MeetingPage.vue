<script setup lang="ts">
import { computed } from 'vue'
import WorkspaceLayout from '@renderer/layouts/WorkspaceLayout.vue'
import StatPanel from '@renderer/components/StatPanel.vue'
import WindowBadge from '@renderer/components/WindowBadge.vue'
import { useMeetingSessionStore } from '@renderer/stores/meetingSession'
import { openMeetingChildWindow } from '@renderer/utils/childWindows'
import type { ChatMessage, Participant } from '@shared/meeting'
import type { ChildWindowRole } from '@shared/window'

/**
 * 当前会议窗口共享会话。
 * 作用：读取所属会议快照，并把所有写操作统一发回主进程。
 * 为什么要有：B 窗口是会议域主工作区，大多数演示交互都从这里发起。
 */
const meetingSession = useMeetingSessionStore()

/** 当前窗口上下文，主要用于取 meetingId 和 windowId。 */
const context = computed(() => meetingSession.context)
/** 当前会议域快照。 */
const snapshot = computed(() => meetingSession.snapshot)
/** 成员列表的便捷计算属性，避免模板里频繁写可空链。 */
const members = computed(() => snapshot.value?.channels.members ?? [])
/** 聊天消息列表的便捷计算属性。 */
const chat = computed(() => snapshot.value?.channels.chat.messages ?? [])

const layoutModeLabels: Record<'gallery' | 'speaker', string> = {
  gallery: '画廊',
  speaker: '演讲者'
}

const memberRoleLabels: Record<Participant['role'], string> = {
  host: '主持人',
  speaker: '演讲者',
  guest: '嘉宾'
}

/**
 * 可从 B 窗口打开的全部子窗口定义。
 * 作用：驱动模板按钮渲染，避免按钮文本和角色枚举分散维护。
 * 为什么要有：会议根窗口承担子窗口入口职责，配置集中更易扩展。
 */
const childWindows: Array<{ label: string; role: ChildWindowRole }> = [
  { label: '画廊视图', role: 'gallery' },
  { label: '聚焦视图', role: 'spotlight' },
  { label: '参会名册', role: 'roster' },
  { label: '聊天窗口', role: 'chat' },
  { label: '屏幕共享', role: 'screen-share' }
]

/**
 * 打开指定角色的子窗口。
 * 作用：把当前 meetingId 传入 window.open 流程，确保子窗口加入正确会议域。
 * 为什么要有：子窗口必须知道自己属于哪场会议，否则无法读取共享快照。
 */
const openChild = (role: ChildWindowRole): void => {
  if (!context.value?.meetingId) {
    return
  }

  openMeetingChildWindow(context.value.meetingId, role)
}

/**
 * 切换布局模式。
 * 作用：演示对象频道的局部 merge 更新和实时广播。
 * 为什么要有：布局变化是会议中最直观的共享状态之一。
 */
const toggleLayout = async (): Promise<void> => {
  if (!snapshot.value) {
    return
  }

  await meetingSession.updateChannel('layout', {
    mode: snapshot.value.channels.layout.mode === 'gallery' ? 'speaker' : 'gallery'
  })
}

/**
 * 切换举手队列锁定状态。
 * 作用：演示另一个实时频道的布尔值更新。
 * 为什么要有：主持控制类状态通常需要所有窗口立刻感知。
 */
const toggleHandRaiseLock = async (): Promise<void> => {
  if (!snapshot.value) {
    return
  }

  await meetingSession.updateChannel('handRaise', {
    locked: !snapshot.value.channels.handRaise.locked
  })
}

/**
 * 推送一条系统通知。
 * 作用：演示共享信息频道的批处理更新。
 * 为什么要有：通知类信息通常允许轻微延迟，以换取更低的广播频率。
 */
const pushNotice = async (): Promise<void> => {
  if (!snapshot.value) {
    return
  }

  await meetingSession.updateChannel(
    'shared',
    {
      notices: [
        `通知已更新：${new Date().toLocaleTimeString()}`,
        ...snapshot.value.channels.shared.notices.slice(0, 3)
      ]
    },
    'merge',
    'batched'
  )
}

/**
 * 追加一条聊天消息。
 * 作用：演示列表型频道整体替换，以及不同窗口可写同一聊天流。
 * 为什么要有：聊天是最容易观察批处理效果的高频更新场景。
 */
const appendChatMessage = async (): Promise<void> => {
  if (!snapshot.value) {
    return
  }

  // sender 文案故意依赖窗口角色，便于观察消息来自哪个窗口类型。
  const nextMessage: ChatMessage = {
    id: crypto.randomUUID(),
    sender: context.value?.role === 'meeting' ? '会议主窗口' : '子窗口',
    content: `消息时间：${new Date().toLocaleTimeString()}`,
    timestamp: Date.now()
  }

  await meetingSession.replaceChannel(
    'chat',
    {
      messages: [...snapshot.value.channels.chat.messages, nextMessage].slice(-20),
      unread: 0
    },
    'batched'
  )
}

/**
 * 模拟成员状态连续波动。
 * 作用：制造一批高频成员更新，测试 batched 规则是否生效。
 * 为什么要有：成员 speaking、mic、camera 等状态在真实会议中变化很快。
 */
const simulateMemberBurst = async (): Promise<void> => {
  if (!snapshot.value) {
    return
  }

  // 随机制造一个当前发言者，并顺带翻转部分举手状态，模拟实时会议波动。
  const nextMembers = snapshot.value.channels.members.map((member, index) => {
    const speaking = index === Math.floor(Math.random() * snapshot.value!.channels.members.length)
    return {
      ...member,
      micOn: speaking ? true : index % 2 === 0,
      cameraOn: index % 3 !== 0,
      speaking,
      handRaised: index % 5 === 0 ? !member.handRaised : member.handRaised
    }
  })

  await meetingSession.replaceChannel('members', nextMembers, 'batched')
}

/**
 * 轮换聚焦成员。
 * 作用：按顺序移动 spotlight 目标，演示布局频道中的焦点同步。
 * 为什么要有：多窗口会议 UI 往往需要共享“当前焦点是谁”这类展示状态。
 */
const rotateSpotlight = async (): Promise<void> => {
  if (!snapshot.value) {
    return
  }

  const currentId = snapshot.value.channels.layout.focusParticipantId
  const currentIndex = members.value.findIndex((participant) => participant.id === currentId)
  const nextIndex = currentIndex >= members.value.length - 1 ? 0 : currentIndex + 1
  const nextParticipant = members.value[nextIndex]

  await meetingSession.updateChannel('layout', {
    focusParticipantId: nextParticipant?.id ?? null
  })
}

/**
 * 随机让一名成员举手。
 * 作用：同时更新成员列表和举手队列，演示跨频道协同修改。
 * 为什么要有：真实业务里一个用户动作常常会影响多个共享频道。
 */
const raiseRandomHand = async (): Promise<void> => {
  if (!snapshot.value || members.value.length === 0) {
    return
  }

  // 用 Set 去重，避免同一成员重复进入举手队列。
  const target = members.value[Math.floor(Math.random() * members.value.length)]
  const queue = new Set(snapshot.value.channels.handRaise.queue)
  queue.add(target.id)

  // 先更新成员卡片上的 handRaised 标记，再更新单独的举手队列频道。
  const nextMembers: Participant[] = members.value.map((participant) =>
    participant.id === target.id ? { ...participant, handRaised: true } : participant
  )

  await meetingSession.replaceChannel('members', nextMembers, 'batched')
  await meetingSession.replaceChannel(
    'handRaise',
    {
      ...snapshot.value.channels.handRaise,
      queue: Array.from(queue)
    },
    'realtime'
  )
}
</script>

<template>
  <WorkspaceLayout
    :title="snapshot?.channels.config.title ?? '会议工作区'"
    subtitle="B 窗口负责整场会议的生命周期。关闭这个窗口会同时关闭所有子窗口，并销毁会议状态。"
    role-label="B 窗口"
  >
    <template #actions>
      <!-- 会议 ID 和窗口 ID 用于观察当前窗口在主进程登记的上下文身份。 -->
      <div class="action-row">
        <WindowBadge :label="context?.meetingId?.slice(0, 8) ?? '会议'" accent="gold" />
        <WindowBadge :label="context?.windowId?.slice(0, 8) ?? '窗口'" />
      </div>
    </template>

    <!-- 会议级核心指标：用最短路径展示当前共享状态的关键结果。 -->
    <section class="hero-grid">
      <StatPanel title="参会成员" :value="members.length" caption="成员频道默认在主进程中按批量策略同步。" />
      <StatPanel title="聊天消息" :value="chat.length" caption="聊天默认走批量同步，但也可以按需强制实时。" />
      <StatPanel
        title="举手人数"
        :value="snapshot?.channels.handRaise.queue.length ?? 0"
        caption="举手队列当前配置为实时同步。"
      />
      <StatPanel
        title="布局模式"
        :value="snapshot ? layoutModeLabels[snapshot.channels.layout.mode] : '画廊'"
        caption="布局变化会立即广播到 B 窗口和全部子窗口。"
      />
    </section>

    <!-- 第一行左侧负责打开子窗口，说明 B 窗口是会议域的父级入口。 -->
    <section class="panel-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>打开子窗口</h2>
          <WindowBadge label="窗口打开" accent="mint" />
        </div>
        <div class="chip-grid">
          <button
            v-for="child in childWindows"
            :key="child.role"
            class="secondary-button"
            @click="openChild(child.role)"
          >
            {{ child.label }}
          </button>
        </div>
      </article>

      <!-- 第一行右侧集中放置状态改写动作，用于演示不同频道的同步策略。 -->
      <article class="panel">
        <div class="panel-head">
          <h2>共享状态控制</h2>
          <WindowBadge label="IPC" />
        </div>
        <div class="control-grid">
          <button class="secondary-button" @click="toggleLayout">切换布局</button>
          <button class="secondary-button" @click="rotateSpotlight">轮换聚焦成员</button>
          <button class="secondary-button" @click="toggleHandRaiseLock">切换队列锁定</button>
          <button class="secondary-button" @click="raiseRandomHand">随机成员举手</button>
          <button class="secondary-button" @click="appendChatMessage">追加聊天消息</button>
          <button class="secondary-button" @click="pushNotice">推送通知</button>
          <button class="secondary-button" @click="simulateMemberBurst">模拟成员波动</button>
        </div>
      </article>
    </section>

    <!-- 第二行左侧聚焦成员和布局，右侧聚焦聊天，分别代表结构化数据和列表数据。 -->
    <section class="panel-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>当前焦点成员</h2>
          <WindowBadge label="布局状态" accent="gold" />
        </div>
        <p class="eyebrow">
          {{ snapshot?.channels.layout.focusParticipantId ?? '当前没有焦点成员' }}
        </p>
        <ul class="member-list">
          <li v-for="member in members.slice(0, 8)" :key="member.id">
            <strong>{{ member.name }}</strong>
            <span>{{ memberRoleLabels[member.role] }}</span>
            <span>{{ member.micOn ? '麦克风开启' : '麦克风关闭' }}</span>
            <span>{{ member.cameraOn ? '摄像头开启' : '摄像头关闭' }}</span>
          </li>
        </ul>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>最近聊天</h2>
          <WindowBadge label="聊天消息" />
        </div>
        <ul class="message-list">
          <li v-for="message in chat.slice(-5).reverse()" :key="message.id">
            <strong>{{ message.sender }}</strong>
            <p>{{ message.content }}</p>
          </li>
        </ul>
      </article>
    </section>
  </WorkspaceLayout>
</template>
