<script setup lang="ts">
import type { StudyCardData } from '@renderer/types/home'

defineProps<{
  card: StudyCardData
}>()
</script>

<template>
  <article class="study-card">
    <div class="study-cover" :class="card.coverClass">
      <div class="study-badges">
        <span v-for="badge in card.badges" :key="badge">{{ badge }}</span>
      </div>
    </div>

    <div class="study-body">
      <h3>{{ card.title }}</h3>
      <p>{{ card.subtitle }}</p>
    </div>
  </article>
</template>

<style scoped>
.study-card {
  overflow: hidden;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #edf0f5;
  box-shadow: 0 12px 28px rgba(28, 43, 76, 0.06);
}

.study-cover {
  position: relative;
  height: 136px;
}

.study-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.12) 100%),
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.34), transparent 35%);
}

.cover-book {
  background:
    radial-gradient(circle at 74% 24%, rgba(255, 241, 178, 0.8), transparent 24%),
    linear-gradient(120deg, #eab261 0%, #dfd8ba 55%, #9bc5d5 100%);
}

.cover-orange {
  background:
    radial-gradient(circle at 72% 22%, rgba(255, 232, 197, 0.74), transparent 26%),
    linear-gradient(120deg, #d96e29 0%, #ef9a34 55%, #ddc15b 100%);
}

.cover-blue {
  background:
    radial-gradient(circle at 80% 26%, rgba(180, 225, 255, 0.78), transparent 24%),
    linear-gradient(120deg, #163a8a 0%, #2563eb 48%, #183153 100%);
}

.cover-sky {
  background:
    radial-gradient(circle at 78% 20%, rgba(255, 255, 255, 0.86), transparent 26%),
    linear-gradient(120deg, #b0d6e8 0%, #d3ecf6 55%, #8bb4d8 100%);
}

.study-badges {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.study-badges span {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(233, 84, 43, 0.94);
  color: #fff8f5;
  font-size: 0.74rem;
  font-weight: 600;
}

.study-body {
  padding: 12px 14px 14px;
}

.study-body h3 {
  margin: 0;
  color: #2f3440;
  font-size: 1rem;
  line-height: 1.4;
}

.study-body p {
  margin: 6px 0 0;
  color: #9aa2b3;
  font-size: 0.84rem;
}
</style>
