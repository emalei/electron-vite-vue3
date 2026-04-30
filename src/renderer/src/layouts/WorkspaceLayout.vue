<script setup lang="ts">
import WindowBadge from '@renderer/components/WindowBadge.vue'

/**
 * 通用工作区布局参数。
 * 作用：统一页面头部标题、副标题和窗口角色标签。
 * 为什么要有：大厅页、会议页和子窗口页共享相同骨架，抽成布局组件可以减少重复。
 */
defineProps<{
  title: string
  subtitle: string
  roleLabel: string
}>()
</script>

<template>
  <!-- 整个页面的外层容器，负责统一头部和内容区结构。 -->
  <div class="workspace-layout">
    <header class="workspace-header">
      <div>
        <WindowBadge :label="roleLabel" accent="mint" />
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>

    <main class="workspace-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
/* 页面根布局：保证每个窗口都占满视口，并保留统一内边距。 */
.workspace-layout {
  min-height: 100vh;
  padding: 2rem;
}

/* 头部采用左右分栏，左侧介绍窗口用途，右侧放操作区或上下文标签。 */
.workspace-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

/* 主标题需要在深色背景里保持明确的视觉焦点。 */
h1 {
  margin: 0.65rem 0 0.35rem;
  font-size: clamp(2rem, 2.7vw, 3rem);
  color: #f8fafc;
}

/* 副标题负责解释当前窗口职责，因此限制宽度以保证可读性。 */
p {
  margin: 0;
  max-width: 42rem;
  color: #a7b6d8;
}

/* 主内容区用纵向间距组织多个卡片区块。 */
.workspace-main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
</style>
