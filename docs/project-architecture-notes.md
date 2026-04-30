# Project Architecture Notes

## Purpose

This project is an Electron + Vue 3 + TypeScript multi-window meeting foundation.

Its current purpose is to demonstrate these capabilities:

- one lobby window that only opens meetings
- one root meeting window per `meetingId`
- multiple child windows under the same meeting
- shared meeting state stored in the Electron main process
- IPC-based state reads and writes
- per-channel sync policy with realtime or batched delivery

This architecture exists to solve a common desktop problem:
when one feature is split across several Electron windows, state must not live inside any single renderer window, otherwise closing or refreshing one window can break the rest.

## Window Model

### Window A: Lobby

Files:

- [HomePage.vue](/Users/m/工作/electron/src/renderer/src/pages/HomePage.vue)
- [window-registry.ts](/Users/m/工作/electron/electron/main/services/window-registry.ts)

Role:

- acts as the application entry window
- does not join live meeting traffic
- requests creation of a new meeting workspace

Why it exists:

- keeps pre-meeting and in-meeting responsibilities separate
- avoids mixing meeting state with the top-level launcher
- makes it obvious that each meeting gets its own isolated state domain

### Window B: Meeting Root

Files:

- [MeetingPage.vue](/Users/m/工作/electron/src/renderer/src/pages/MeetingPage.vue)
- [meetingSession.ts](/Users/m/工作/electron/src/renderer/src/stores/meetingSession.ts)

Role:

- owns the main workspace for one `meetingId`
- opens child windows
- reads and writes shared meeting channels

Why it exists:

- gives each meeting a clear parent window
- provides a lifecycle anchor for child windows
- allows one close action to tear down the whole meeting domain

### Child Windows

Files:

- [ChildWindowPage.vue](/Users/m/工作/electron/src/renderer/src/pages/ChildWindowPage.vue)
- [childWindows.ts](/Users/m/工作/electron/src/renderer/src/utils/childWindows.ts)
- [window.ts](/Users/m/工作/electron/src/shared/window.ts)

Role:

- represent focused views like gallery, spotlight, roster, chat, and screen share
- read the same shared state as the root meeting window
- can also write shared state back through main-process IPC

Why they exist:

- real meeting products often split views into dedicated windows
- they prove that multiple renderer processes can share one meeting domain
- they make the main-process state hub meaningful instead of theoretical

## State Model

### Source of Truth

Files:

- [meeting-hub.ts](/Users/m/工作/electron/electron/main/services/meeting-hub.ts)
- [meeting.ts](/Users/m/工作/electron/src/shared/meeting.ts)

The main process is the source of truth for meeting state.

Why this matters:

- every renderer window becomes a consumer of shared state, not the owner
- newly opened windows can fetch a full snapshot immediately
- closing one renderer does not implicitly destroy state for the others

### Meeting Channels

Current channels:

- `members`
- `config`
- `layout`
- `handRaise`
- `chat`
- `shared`

Why channels exist:

- each category has different update frequency and consistency needs
- they provide a stable contract for both UI and IPC
- sync policy can be tuned per channel instead of globally

### Snapshot + Broadcast

Current flow:

1. a renderer asks for its meeting snapshot during bootstrap
2. the main process returns the full current state
3. later updates are delivered as channel-changed broadcasts

Why this pattern exists:

- snapshot gives a stable starting point
- broadcast keeps windows in sync afterward
- this avoids rebuilding state from a long event history

## Sync Strategy

### Realtime

Examples:

- `layout`
- `config`
- `handRaise`

Why realtime exists:

- these changes affect coordination and visibility immediately
- windows should converge as soon as possible on these channels

### Batched

Examples:

- `members`
- `chat`
- `shared`

Why batched exists:

- these channels can change frequently
- sending every intermediate state is noisy and wasteful
- keeping only the latest value in a short time window is enough for the demo

## IPC Design

Files:

- [ipc.ts](/Users/m/工作/electron/src/shared/ipc.ts)
- [register-ipc.ts](/Users/m/工作/electron/electron/main/ipc/register-ipc.ts)
- [preload/index.ts](/Users/m/工作/electron/electron/preload/index.ts)

Current IPC responsibilities:

- create a meeting window
- get current window context
- get a meeting snapshot
- submit a meeting channel update
- subscribe to state-changed broadcasts

Why this design exists:

- renderer windows should use a narrow, typed API surface
- preload isolates Electron primitives from normal UI code
- shared IPC types reduce drift between main and renderer implementations

## Renderer Responsibilities

### Router

File:

- [router/index.ts](/Users/m/工作/electron/src/renderer/src/router/index.ts)

Role:

- maps routes to lobby, meeting, and child pages

Why it exists:

- one renderer app can serve several window roles
- route parsing also helps `window.open` target the correct child view

### Store

File:

- [meetingSession.ts](/Users/m/工作/electron/src/renderer/src/stores/meetingSession.ts)

Role:

- bootstraps window context
- fetches the meeting snapshot
- subscribes to updates
- forwards write requests to the main process

Why it exists:

- prevents each page from re-implementing the same IPC lifecycle logic
- creates one clear window-level state boundary

### UI Components

Files:

- [WorkspaceLayout.vue](/Users/m/工作/electron/src/renderer/src/layouts/WorkspaceLayout.vue)
- [StatPanel.vue](/Users/m/工作/electron/src/renderer/src/components/StatPanel.vue)
- [WindowBadge.vue](/Users/m/工作/electron/src/renderer/src/components/WindowBadge.vue)
- [main.css](/Users/m/工作/electron/src/renderer/src/styles/main.css)

Role:

- provide a consistent shell for every window type
- expose the project structure visually
- keep the demo easy to scan during state changes

Why they exist:

- a multi-window demo becomes hard to understand if every page looks unrelated
- repeated structural patterns are easier to maintain as shared components

## Lifecycle Rules

Important rule:

- closing a meeting root window closes all child windows and destroys that meeting state

Files:

- [window-registry.ts](/Users/m/工作/electron/electron/main/services/window-registry.ts)
- [meeting-hub.ts](/Users/m/工作/electron/electron/main/services/meeting-hub.ts)

Why this rule exists:

- child windows should never outlive the meeting they belong to
- meeting state should not remain in memory after the meeting is finished
- cleanup must happen in the main process because only it can see all windows

## Why This Project Structure Is Reasonable

This project is intentionally split into these layers:

- `src/shared`
- `electron/main`
- `electron/preload`
- `src/renderer`

Why this split exists:

- `src/shared` holds contracts used by both sides
- `electron/main` owns native window and state authority
- `electron/preload` exposes a narrow secure bridge
- `src/renderer` focuses on UI and user interaction

That separation keeps the architecture understandable:

- shared files define the protocol
- main process enforces the protocol
- renderer consumes the protocol

## Reading Order

If you want to understand the project quickly, read in this order:

1. [README.md](/Users/m/工作/electron/README.md)
2. [src/shared/meeting.ts](/Users/m/工作/electron/src/shared/meeting.ts)
3. [src/shared/ipc.ts](/Users/m/工作/electron/src/shared/ipc.ts)
4. [electron/main/services/meeting-hub.ts](/Users/m/工作/electron/electron/main/services/meeting-hub.ts)
5. [electron/main/services/window-registry.ts](/Users/m/工作/electron/electron/main/services/window-registry.ts)
6. [src/renderer/src/stores/meetingSession.ts](/Users/m/工作/electron/src/renderer/src/stores/meetingSession.ts)
7. [src/renderer/src/pages/MeetingPage.vue](/Users/m/工作/electron/src/renderer/src/pages/MeetingPage.vue)
8. [src/renderer/src/pages/ChildWindowPage.vue](/Users/m/工作/electron/src/renderer/src/pages/ChildWindowPage.vue)

## Current Functional Summary

Today this project already demonstrates:

- lobby-to-meeting window creation
- meeting-scoped isolation by `meetingId`
- child-window creation from a meeting root
- shared state reads and writes across windows
- batched and realtime sync rules
- main-process cleanup on meeting close

That means it is already usable as a foundation for:

- meeting prototypes
- multi-window collaboration tools
- Electron state-sharing experiments
- future RTC or backend integration work
