<template>
  <div class="learning-shell">
    <div class="learning-shell__header">
      <slot name="header" />
    </div>

    <div class="learning-shell__sidebar">
      <slot name="sidebar" />
    </div>

    <main class="learning-shell__content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.learning-shell {
  min-height: 100vh;
  background: #f6f7fb;
}

.learning-shell__header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  height: 74px;
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid #eceff5;
  backdrop-filter: blur(12px);
}

.learning-shell__sidebar {
  position: fixed;
  top: 74px;
  left: 0;
  bottom: 0;
  z-index: 10;
  width: 224px;
  background: #ffffff;
  border-right: 1px solid #eceff5;
}

.learning-shell__content {
  min-height: calc(100vh - 74px);
  margin-top: 74px;
  margin-left: 224px;
  padding: 28px 32px 40px;
}

@media (max-width: 1100px) {
  .learning-shell__content {
    padding: 24px 20px 32px;
  }
}

@media (max-width: 920px) {
  .learning-shell__sidebar {
    width: 88px;
  }

  .learning-shell__content {
    margin-left: 88px;
  }
}

@media (max-width: 720px) {
  .learning-shell__header {
    position: static;
    height: auto;
  }

  .learning-shell__sidebar {
    position: static;
    width: auto;
    border-right: 0;
    border-bottom: 1px solid #eceff5;
  }

  .learning-shell__content {
    min-height: auto;
    margin-top: 0;
    margin-left: 0;
    padding: 18px 14px 28px;
  }
}
</style>
