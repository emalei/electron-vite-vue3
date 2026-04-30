# Electron Meeting Foundation

Electron + Vue 3 + TypeScript meeting foundation focused on multi-window state sharing.

## Chinese Docs

- [docs/index.zh-CN.md](/Users/m/工作/electron/docs/index.zh-CN.md)
- [docs/session-handoff.zh-CN.md](/Users/m/工作/electron/docs/session-handoff.zh-CN.md)
- [README.zh-CN.md](/Users/m/工作/electron/README.zh-CN.md)
- [docs/project-architecture-notes.zh-CN.md](/Users/m/工作/electron/docs/project-architecture-notes.zh-CN.md)
- [docs/page-flow-notes.zh-CN.md](/Users/m/工作/electron/docs/page-flow-notes.zh-CN.md)
- [docs/sequence-diagrams.zh-CN.md](/Users/m/工作/electron/docs/sequence-diagrams.zh-CN.md)

## Included

- `electron-vite` based build setup
- `Vue Router` and `Pinia`
- `main` process meeting state hub
- isolated per-`meetingId` shared state domains
- `window.open` child window flow
- placeholder windows for home, meeting, gallery, spotlight, roster, chat, and screen share
- ESLint, Prettier, strict TypeScript

## Scripts

```bash
npm install
npm run dev
```

## Architecture

- `A` window: meeting list shell
- `B` window: single meeting workspace
- child windows: gallery, spotlight, roster, chat, screen share
- cross-window meeting state lives in `main`
- each meeting is isolated by `meetingId`
- closing a `B` window closes all child windows and destroys the meeting state
