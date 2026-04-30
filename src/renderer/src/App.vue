<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useMeetingSessionStore } from '@renderer/stores/meetingSession'

/**
 * 当前窗口的会议会话 store。
 * 作用：统一管理窗口上下文、共享快照和订阅生命周期。
 * 为什么要有：不同页面都依赖同一份窗口级会话信息，不适合散落在组件里各自处理。
 */
const meetingSession = useMeetingSessionStore()

onMounted(async () => {
  // 根组件启动时先完成窗口上下文和会议快照初始化，后续页面才能安全读取状态。
  await meetingSession.bootstrap()
})
</script>

<template>
  <!-- 根组件只负责承载路由视图，具体窗口功能由页面级组件决定。 -->
  <RouterView />
</template>
