<script setup lang="ts">
import { computed } from 'vue'
import WorkspaceLayout from '@renderer/layouts/WorkspaceLayout.vue'
import StatPanel from '@renderer/components/StatPanel.vue'
import WindowBadge from '@renderer/components/WindowBadge.vue'
import { useMeetingSessionStore } from '@renderer/stores/meetingSession'
import { meetingChannelLabels } from '@shared/meeting'
import type { ChildWindowRole } from '@shared/window'

const props = defineProps<{
  type: ChildWindowRole
}>()

/**
 * 当前子窗口对应的会议会话。
 * 作用：读取与父会议根窗口同一个 meetingId 下的共享状态。
 * 为什么要有：这个页面的核心目的是证明子窗口并不是只读视图，也能安全写共享状态。
 */
const meetingSession = useMeetingSessionStore()

/** 当前会议快照。 */
const snapshot = computed(() => meetingSession.snapshot)
/** 当前窗口上下文，用于展示 windowId / meetingId。 */
const context = computed(() => meetingSession.context)

/**
 * 子窗口角色到展示标题的映射。
 * 作用：让一个通用页面组件根据角色切换标题文案。
 * 为什么要有：避免为每种子窗口重复写几乎相同的页面组件。
 */
const titleMap: Record<ChildWindowRole, string> = {
  gallery: '画廊视图',
  spotlight: '聚焦视图',
  roster: '参会名册',
  chat: '聊天窗口',
  'screen-share': '屏幕共享'
}

const pinnedWindowLabelMap: Record<ChildWindowRole, string> = {
  gallery: '画廊视图',
  spotlight: '聚焦视图',
  roster: '参会名册',
  chat: '聊天窗口',
  'screen-share': '屏幕共享'
}

/**
 * 当前会议所有频道的摘要列表。
 * 作用：让子窗口直观看到自己消费的是整场会议的共享状态，而不是局部数据。
 * 为什么要有：示例项目的目标之一就是把“同一 meetingId 下状态全局共享”展示清楚。
 */
const channelSummary = computed(() => {
  if (!snapshot.value) {
    return []
  }

  return Object.entries(snapshot.value.channels).map(([channel, value]) => ({
    channel,
    label: meetingChannelLabels[channel as keyof typeof meetingChannelLabels],
    // 数组显示元素个数，对象显示字段个数，足够作为概览而不泄露过多细节。
    summary: Array.isArray(value) ? `${value.length} 项` : `${Object.keys(value).length} 个字段`
  }))
})

/**
 * 把当前子窗口类型写入共享布局。
 * 作用：演示子窗口也能影响主会议布局配置。
 * 为什么要有：否则子窗口只能被动观察，无法证明双向共享写入链路成立。
 */
const tweakWindowLayout = async (): Promise<void> => {
  await meetingSession.updateChannel('layout', {
    pinnedWindow: props.type
  })
}

/**
 * 从子窗口追加一条聊天消息。
 * 作用：演示子窗口写入后，B 窗口和其他子窗口都能收到一致变更。
 * 为什么要有：这是验证“多窗口共同写同一会议域”的最直观方式之一。
 */
const writeFromChild = async (): Promise<void> => {
  if (!snapshot.value) {
    return
  }

  await meetingSession.replaceChannel(
    'chat',
    {
      messages: [
        ...snapshot.value.channels.chat.messages,
        {
          id: crypto.randomUUID(),
          sender: titleMap[props.type],
          content: `${titleMap[props.type]}更新了共享状态。`,
          timestamp: Date.now()
        }
      ].slice(-20),
      unread: 0
    },
    'batched'
  )
}
</script>

<template>
  <WorkspaceLayout
    :title="titleMap[type]"
    subtitle="这个子窗口与父级 B 窗口读写同一个会议域中的共享状态。"
    :role-label="titleMap[type]"
  >
    <template #actions>
      <!-- 子窗口同样展示会议 ID 和窗口 ID，证明它拥有独立窗口身份但共享同一会议域。 -->
      <div class="action-row">
        <WindowBadge :label="context?.meetingId?.slice(0, 8) ?? '会议'" accent="gold" />
        <WindowBadge :label="context?.windowId?.slice(0, 8) ?? '子窗'" />
      </div>
    </template>

    <!-- 顶部指标区强调子窗口不是孤立页面，而是主进程共享状态体系中的参与者。 -->
    <section class="hero-grid">
      <StatPanel
        title="会议版本"
        :value="snapshot?.version ?? 0"
        caption="来自 B 窗口或任意子窗口的变化，都会先在主进程汇总后再到达这里。"
      />
      <StatPanel
        title="固定窗口"
        :value="snapshot?.channels.layout.pinnedWindow ? pinnedWindowLabelMap[snapshot.channels.layout.pinnedWindow] : '无'"
        caption="子窗口也可以修改共享布局状态。"
      />
      <StatPanel title="消息数量" :value="snapshot?.channels.chat.messages.length ?? 0" caption="同一会议中的所有窗口会共享一致的聊天消息。" />
    </section>

    <!-- 左侧概览会议域里的频道结构，右侧提供最小写操作入口验证子窗口可写。 -->
    <section class="panel-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>频道概览</h2>
          <WindowBadge label="会议域" accent="mint" />
        </div>
        <ul class="member-list">
          <li v-for="item in channelSummary" :key="item.channel">
            <strong>{{ item.label }}</strong>
            <span>{{ item.summary }}</span>
          </li>
        </ul>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>子窗口操作</h2>
          <WindowBadge label="可写权限" />
        </div>
        <div class="control-grid">
          <button class="secondary-button" @click="tweakWindowLayout">固定当前窗口类型</button>
          <button class="secondary-button" @click="writeFromChild">写入共享聊天更新</button>
        </div>
      </article>
    </section>
  </WorkspaceLayout>
</template>
