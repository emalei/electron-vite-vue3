<script setup lang="ts">
import { ref } from 'vue'
import WorkspaceLayout from '@renderer/layouts/WorkspaceLayout.vue'
import StatPanel from '@renderer/components/StatPanel.vue'
import WindowBadge from '@renderer/components/WindowBadge.vue'

/**
 * 已从大厅打开过的会议 ID 列表。
 * 作用：在 UI 中展示大厅窗口触发过哪些会议实例。
 * 为什么要有：这个列表可以直观看出大厅窗口只负责“发起会议”，不参与会议实时状态。
 */
const openedMeetings = ref<string[]>([])

/**
 * 会议窗口创建中的加载标记。
 * 作用：防止用户在主进程尚未返回时连续点击按钮。
 * 为什么要有：重复触发会连续开多个会议窗口，体验和示例意图都不合适。
 */
const creating = ref(false)

/**
 * 请求主进程创建新的会议工作区。
 * 作用：演示大厅窗口到主进程再到会议根窗口的完整打开链路。
 * 为什么要有：大厅页的存在意义就是把“会前入口”和“会中状态域”明确分离。
 */
const createMeeting = async (): Promise<void> => {
  creating.value = true
  try {
    const response = await window.electronAPI.shell.createMeetingWindow()
    // 最新创建的会议排在最前面，便于观察刚刚打开的会议实例。
    openedMeetings.value.unshift(response.meetingId)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <WorkspaceLayout
    title="会议大厅"
    subtitle="A 窗口与会中实时状态隔离，只负责打开新的会议工作区。"
    role-label="A 窗口"
  >
    <template #actions>
      <!-- 大厅页唯一关键动作：请求主进程打开新的会议根窗口。 -->
      <button class="primary-button" :disabled="creating" @click="createMeeting">
        {{ creating ? '打开中...' : '打开会议工作区' }}
      </button>
    </template>

    <!-- 顶部指标区用来快速解释这个大厅窗口在整套架构里的定位。 -->
    <section class="hero-grid">
      <StatPanel title="共享状态归属" value="主进程" caption="跨窗口会议状态统一保存在 Electron 主进程中。" />
      <StatPanel title="实例隔离" value="meetingId" caption="每个 B 窗口都拥有独立的会议状态域。" />
      <StatPanel title="窗口策略" value="window.open" caption="子窗口从 B 窗口发起，并由主进程统一登记。" />
    </section>

    <!-- 下方左侧展示大厅页已经发起过哪些会议，强调它只是入口而不是会中窗口。 -->
    <section class="panel-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>从大厅发起的会议</h2>
          <WindowBadge label="A -> B" accent="gold" />
        </div>
        <p>每次点击都会打开一个新的会议窗口，并在主进程里创建独立的共享状态容器。</p>
        <ul class="meeting-list">
          <li v-for="meetingId in openedMeetings" :key="meetingId">
            <strong>{{ meetingId }}</strong>
          </li>
          <li v-if="openedMeetings.length === 0" class="empty-state">
            还没有打开任何会议工作区。
          </li>
        </ul>
      </article>

      <!-- 右侧说明当前脚手架已经内置了哪些关键能力，帮助快速理解项目边界。 -->
      <article class="panel">
        <div class="panel-head">
          <h2>脚手架内置能力</h2>
          <WindowBadge label="基础能力" />
        </div>
        <ul class="bullet-list">
          <li>会议根窗口，以及五种子窗口类型</li>
          <li>用于快照读取和共享状态更新的 IPC 桥</li>
          <li>支持按频道配置实时或批量同步策略</li>
          <li>会议根窗口关闭时自动执行完整清理</li>
        </ul>
      </article>
    </section>
  </WorkspaceLayout>
</template>
