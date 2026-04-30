<script setup lang="ts">
/**
 * 统计卡片参数。
 * 作用：统一渲染标题、主值和补充说明。
 * 为什么要有：会议页面和子窗口页面都需要这类轻量级指标展示组件。
 */
defineProps<{
  title: string
  value: string | number
  caption?: string
}>()
</script>

<template>
  <article class="stat-panel">
    <p>{{ title }}</p>
    <h3>{{ value }}</h3>
    <span v-if="caption">{{ caption }}</span>
  </article>
</template>

<style scoped>
/* 统计卡片外观：在深色背景上制造轻微玻璃质感，用来承载关键指标。 */
.stat-panel {
  padding: 1rem;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02)),
    rgba(8, 15, 31, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 标题和说明统一使用次级文字色，避免和主值抢视觉层级。 */
p,
span {
  margin: 0;
  color: #9ba9c7;
}

/* 主值需要最醒目，因此字号更大、颜色更亮。 */
h3 {
  margin: 0.35rem 0;
  font-size: 1.9rem;
  color: #f8fafc;
}
</style>
