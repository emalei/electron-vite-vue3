<script setup lang="ts">
import type { MeetingRowData } from '@renderer/types/home'

defineProps<{
  meeting: MeetingRowData
}>()

defineEmits<{
  join: []
}>()
</script>

<template>
  <article class="meeting-row" :class="{ 'meeting-row--highlighted': meeting.highlighted }">
    <div class="meeting-time">
      <strong>{{ meeting.time }}</strong>
      <span v-if="meeting.date">{{ meeting.date }}</span>
    </div>

    <div class="meeting-status">
      <span class="status-pill" :class="`status-pill--${meeting.statusTone}`">
        {{ meeting.status }}
      </span>
    </div>

    <div class="meeting-body">
      <div class="meeting-title-row">
        <span v-if="meeting.badge" class="meeting-badge">{{ meeting.badge }}</span>
        <h3>{{ meeting.title }}</h3>
      </div>
      <p>
        {{ meeting.meetingCode }}
        <template v-if="meeting.meta"> · {{ meeting.meta }}</template>
      </p>
    </div>

    <div class="meeting-actions">
      <button v-if="meeting.showMore" type="button" class="more-button" aria-label="更多操作">
        ...
      </button>
      <button v-if="meeting.joinable" type="button" class="join-button" @click="$emit('join')">
        入会
      </button>
    </div>
  </article>
</template>

<style scoped>
.meeting-row {
  display: grid;
  grid-template-columns: 126px 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 10px 16px 0;
  border-bottom: 1px solid #eff2f7;
}

.meeting-row--highlighted {
  margin-inline: -12px;
  padding-inline: 12px;
  border-radius: 12px;
  background: #f4f8ff;
  border-bottom-color: transparent;
}

.meeting-time {
  display: grid;
  gap: 4px;
}

.meeting-time strong {
  color: #2e3340;
  font-size: 1rem;
}

.meeting-time span {
  color: #9aa2b3;
  font-size: 0.82rem;
}

.meeting-status {
  display: flex;
  justify-content: flex-start;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
}

.status-pill--live {
  background: #ecf9ed;
  color: #49a45f;
}

.status-pill--upcoming {
  background: #fff3e7;
  color: #e48b30;
}

.meeting-body {
  min-width: 0;
}

.meeting-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.meeting-title-row h3 {
  margin: 0;
  overflow: hidden;
  color: #242935;
  font-size: 1rem;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meeting-badge {
  flex: 0 0 auto;
  padding: 2px 7px;
  border-radius: 999px;
  background: #f4efe2;
  color: #bb8a26;
  font-size: 0.74rem;
  font-weight: 600;
}

.meeting-body p {
  margin: 6px 0 0;
  color: #9ba2b0;
  font-size: 0.86rem;
}

.meeting-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.more-button,
.join-button {
  border-radius: 8px;
}

.more-button {
  width: 38px;
  height: 32px;
  padding: 0;
  background: #ffffff;
  color: #7f8797;
  font-weight: 700;
}

.join-button {
  min-width: 72px;
  padding: 8px 16px;
  background: linear-gradient(180deg, #bc2218 0%, #8d150f 100%);
  color: #fff8f5;
  font-weight: 600;
}

@media (max-width: 920px) {
  .meeting-row {
    grid-template-columns: 112px 1fr auto;
  }

  .meeting-status {
    display: none;
  }
}

@media (max-width: 720px) {
  .meeting-row,
  .meeting-row--highlighted {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-inline: 0;
    padding: 14px 0;
    border-radius: 0;
  }

  .meeting-actions {
    justify-content: flex-start;
  }

  .meeting-title-row h3 {
    white-space: normal;
  }
}
</style>
