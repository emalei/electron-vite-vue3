<script setup lang="ts">
import type { ShortcutItem } from '@renderer/types/home'

defineProps<{
  shortcuts: ShortcutItem[]
  creating: boolean
}>()

defineEmits<{
  quickMeeting: []
}>()
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark">J</div>
      <div class="brand-text">
        <strong>践泽园</strong>
      </div>
    </div>

    <nav class="shortcut-list" aria-label="顶部快捷入口">
      <button
        v-for="item in shortcuts"
        :key="item.label"
        type="button"
        class="shortcut-button"
        :class="{ 'shortcut-button--active': item.active }"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            v-if="item.icon === 'home'"
            d="M4 11.5 12 5l8 6.5v7a1 1 0 0 1-1 1h-4.8v-5h-4.4v5H5a1 1 0 0 1-1-1z"
          />
          <path
            v-else-if="item.icon === 'heart'"
            d="M12 19.2 5.7 13a4.2 4.2 0 0 1 5.9-6l.4.4.4-.4a4.2 4.2 0 0 1 5.9 6z"
          />
          <path
            v-else
            d="M6 5.5h3.2v13H6zm4.9 0h3.2v13h-3.2zm4.9 0H19v13h-3.2z"
          />
        </svg>
      </button>
    </nav>

    <div class="topbar-actions">
      <button type="button" class="action-button action-button--primary" :disabled="creating" @click="$emit('quickMeeting')">
        {{ creating ? '打开中...' : '快速会议' }}
      </button>
      <button type="button" class="action-button">预定会议</button>
      <button type="button" class="action-button">加入会议</button>
      <button type="button" class="avatar" aria-label="当前用户">M</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: grid;
  grid-template-columns: 224px 1fr auto;
  align-items: center;
  gap: 20px;
  height: 100%;
  padding: 0 20px 0 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8f1718, #c2472e);
  color: #fff7f3;
  font-weight: 700;
}

.brand-text strong {
  font-size: 1.05rem;
  color: #262b37;
  letter-spacing: 0.08em;
}

.shortcut-list {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shortcut-button {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 10px;
  background: transparent;
  color: #8c93a3;
}

.shortcut-button svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.shortcut-button--active {
  color: #b5261e;
  background: #fff3f0;
}

.topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.action-button {
  min-width: 82px;
  padding: 9px 14px;
  border: 1px solid #e8b8b3;
  border-radius: 8px;
  background: #ffffff;
  color: #b23525;
  font-size: 0.9rem;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.action-button:hover {
  background: #fff6f4;
  border-color: #d68a80;
}

.action-button--primary {
  border-color: #cf5e4b;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #f0d2a8, #d7ad7e);
  color: #7c5326;
  font-weight: 700;
}

@media (max-width: 920px) {
  .topbar {
    grid-template-columns: 88px 1fr auto;
    padding-inline: 12px;
  }

  .brand-text {
    display: none;
  }
}

@media (max-width: 720px) {
  .topbar {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 14px;
  }

  .shortcut-list {
    order: 3;
  }

  .topbar-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}
</style>
