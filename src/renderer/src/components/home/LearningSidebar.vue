<script setup lang="ts">
import type { HomeNavItem } from '@renderer/types/home'

defineProps<{
  items: HomeNavItem[]
}>()
</script>

<template>
  <aside class="sidebar">
    <nav class="nav-list" aria-label="主导航">
      <button
        v-for="item in items"
        :key="item.label"
        type="button"
        class="nav-item"
        :class="{ 'nav-item--active': item.active }"
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
            v-else-if="item.icon === 'history'"
            d="M6 5.5h3.2v13H6zm4.9 0h3.2v13h-3.2zm4.9 0H19v13h-3.2z"
          />
          <path
            v-else
            d="M4.5 7.5h6.2v4.9H4.5zm8.8 0h6.2v4.9h-6.2zM4.5 14.8h6.2v4.7H4.5zm8.8 0h6.2v4.7h-6.2z"
          />
        </svg>
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100%;
  padding: 18px 14px;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  background: transparent;
  color: #4e5668;
  text-align: left;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.nav-item svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  fill: currentColor;
}

.nav-item span {
  font-size: 0.98rem;
  font-weight: 600;
}

.nav-item--active {
  background: #fff1ee;
  color: #b52f22;
}

.nav-item:hover {
  background: #f7f8fb;
}

@media (max-width: 920px) {
  .sidebar {
    padding-inline: 10px;
  }

  .nav-item {
    justify-content: center;
    padding-inline: 0;
  }

  .nav-item span {
    display: none;
  }
}

@media (max-width: 720px) {
  .sidebar {
    padding: 10px 14px;
  }

  .nav-list {
    flex-direction: row;
    overflow-x: auto;
  }

  .nav-item {
    flex: 0 0 auto;
    justify-content: flex-start;
    padding-inline: 14px;
  }

  .nav-item span {
    display: inline;
  }
}
</style>
