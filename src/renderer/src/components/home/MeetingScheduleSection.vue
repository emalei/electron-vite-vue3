<script setup lang="ts">
import MeetingRow from '@renderer/components/home/MeetingRow.vue'
import type { MeetingRowData } from '@renderer/types/home'

defineProps<{
  title: string
  meetings: MeetingRowData[]
}>()

defineEmits<{
  join: []
}>()
</script>

<template>
  <section class="schedule-section">
    <div class="section-head">
      <h2>{{ title }}</h2>
    </div>

    <div class="schedule-list">
      <MeetingRow
        v-for="meeting in meetings"
        :key="`${meeting.time}-${meeting.title}-${meeting.date ?? ''}`"
        :meeting="meeting"
        @join="$emit('join')"
      />
    </div>
  </section>
</template>

<style scoped>
.schedule-section {
  padding: 4px 0 0;
}

.section-head {
  margin-bottom: 8px;
}

.section-head h2 {
  margin: 0;
  color: #2b3040;
  font-size: 1.9rem;
  line-height: 1.2;
}

.schedule-list {
  background: #ffffff;
  border: 1px solid #edf0f5;
  border-radius: 16px;
  padding: 0 18px;
  box-shadow: 0 12px 28px rgba(28, 43, 76, 0.05);
}

@media (max-width: 720px) {
  .section-head h2 {
    font-size: 1.5rem;
  }

  .schedule-list {
    padding: 0 14px;
  }
}
</style>
