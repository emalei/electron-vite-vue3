<script setup lang="ts">
/**
 * 窗口徽标参数。
 * 作用：展示窗口角色、窗口 ID 片段或功能标签。
 * 为什么要有：多窗口示例里需要一种足够轻量但辨识度高的标签组件。
 */
defineProps<{
  label: string
  accent?: 'gold' | 'mint' | 'ink'
}>()
</script>

<template>
  <span class="window-badge" :data-accent="accent ?? 'ink'">{{ label }}</span>
</template>

<style scoped>
/* 徽标的基础外观：紧凑、圆角、全大写，强调“标签”而非正文内容。 */
.window-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.72rem;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #dce4f2;
}

/* 金色强调通常用于会议 ID 或布局等更重要的提示。 */
.window-badge[data-accent='gold'] {
  background: rgba(252, 211, 77, 0.14);
  color: #ffe29b;
}

/* 薄荷色强调通常用于窗口角色或正向功能标签。 */
.window-badge[data-accent='mint'] {
  background: rgba(45, 212, 191, 0.14);
  color: #8ef0df;
}
</style>
