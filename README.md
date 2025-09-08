<<<<<<< HEAD
Cadence — Detailed Architecture & Code Map
==========================================

This document is a comprehensive, file-by-file review of the Cadence project. It covers project organization, core APIs, program flow, and code structure so contributors can onboard quickly and make changes confidently.

At a Glance
- Stack: PixiJS v8, Redux Toolkit, Vite + TypeScript (strict), Electron (packaging/runtime).
- Concept: A staff-based project timeline. Tasks render like musical notes; dependencies render as curved ties/slurs. Smooth pan/zoom and direct manipulation (move, resize, link).
- Renderer: Single PixiJS canvas with layered containers. UI (header/sidebar/toolbar/modals/tooltip) rendered in Pixi for coherence and performance.

Quick Start
- Dev (renderer): `npm run dev` (Vite)
- Dev (electron): `npm run electron` (opens Electron; uses Vite dev server if available)
- Typecheck: `npm run typecheck`
- Build bundles: `npm run build` (outputs `dist` + `dist-electron`)
- Package app: `npm run dist` (electron-builder for Win/Mac/Linux)

Organization
- App runtime and wiring
  - `src/runtime/bootstrap.ts`: DOM setup, `Renderer` initialization, store sync, event binding, keyboard shortcuts, command IPC binding.
  - `src/runtime/bindRendererActions.ts`: One-time wiring from `Renderer` to Redux actions.
  - `src/runtime/keyboard.ts`: Keyboard shortcuts mapped to command registry.
  - `src/runtime/commands.ts`: Central command registry (zoom in/out/reset, selection clear).
  - `src/runtime/demo/seedData.ts`: Development-only seed data.
  - `src/runtime/interactions/*`: Pointer event handlers and focused FSMs for pan/move/resize/link/select.
- Rendering
  - `src/renderer/core/*`: Pixi app wrapper, viewport math, top-level `Renderer`, and error/health utilities.
  - `src/renderer/passes/*`: Grid, tasks, and visual effects render passes.
  - `src/renderer/primitives/*`: Low-level drawing helpers reused by passes/UI.
  - `src/renderer/ui/*`: Header, sidebar, toolbar, tooltip, modals, and debug overlay (all rendered with Pixi).
  - `src/renderer/{timelineMath,timeScale,dateHeader}.ts`: Time/scale math and date header VM logic.
- State & domain
  - `src/state/*`: Redux store, slices (ui/staffs/tasks/dependencies), and selectors (tasks/dependencies/analytics).
  - `src/domain/services/storage.ts`: Storage abstraction (localStorage vs. Electron IPC).
  - `src/types/*`: Domain and renderer-facing types.
  - `src/shared/*`: Cross-cutting utilities (timeline constants, CSS color cache, geometry helpers).
- Electron
  - `src/main/index.ts`: App window, security flags, WebGPU flags, simple file-backed storage IPC, menu → IPC command routing.
  - `src/preload/index.ts`: Secure `window.cadence` bridge (version, sync storage, command subscription).
- Build & styles
  - `vite.config.ts`, `tsconfig*.json`: Vite + Electron build, path aliases, strict TS config.
  - `src/styles/*`: CSS tokens, layout/base styles injected by `index.html`.

Program Flow
1) Electron startup (`src/main/index.ts`)
- Enables WebGPU flags; in dev, redirects `userData` to a temp folder.
- Creates `BrowserWindow` with secure `webPreferences` and preload script.
- Loads Vite dev server (with retry) or static `dist/index.html`.
- Builds app menu; menu items send `cadence:command` IPC to focused window.

2) Renderer bootstrap (`src/runtime/bootstrap.ts`)
- Creates DOM structure: `.content > .main > canvas`.
- Instantiates `Renderer(canvas)`, seeds dev data, binds Redux actions to renderer.
- Subscribes to store; shallow-ref checks coalesce updates and schedule `renderer.render()` via `requestAnimationFrame`.
- Wires pointer events through `createEventHandlers(...)`, which delegates to small FSMs for pan/move/resize/dependency-link/selection.
- Sets keyboard shortcuts; binds IPC command sink to the command registry.

3) Render pipeline (`src/renderer/core/Renderer.ts`)
- Layers: background → dependencies → tasks → UI, managed by `PixiApplication`.
- Steps per frame (all wrapped in `safePixiOperation`):
  1. Background grid, vignette.
  2. Staff lines; collect staff block metrics.
  3. Measure markers and “today” marker.
  4. Hover effects.
  5. Tasks (note head + duration track + label + glyphs); returns layout rectangles.
  6. Dependencies (curved ties) using task layout.
  7. Tooltip (looked up via hit test) and positioning.
  8. Header (date labels/ticks), sidebar (staffs + resize grip), toolbar (buttons).
  9. Modals (staff manager / task details) when active.
  10. Effects overlay (particles, blooms, streaks).
  11. Dev debug overlay (FPS/draw calls/tasks rendered).

4) Interactions (`src/runtime/interactions/*`)
- `eventHandlers.ts`: Central pointer router. Detects UI hits first (toolbar/staff manager/task details), else falls back to timeline operations.
- FSMs:
  - `fsm/dragPan.ts`: Pans viewport from raw deltas with pixels-per-day scaling.
  - `fsm/moveTask.ts`: Computes snapped day/staff/line, previews position, commits via `moveTask()`.
  - `fsm/resizeTask.ts`: Computes new duration from screenX → world days; previews width, commits via `resizeTask()`.
  - `fsm/linkDependency.ts`: Previews curve, commits dependency if dropped on a different task.
  - `fsm/selection.ts`: Click/modified-click selection semantics.

5) State & persistence (`src/state/*`, `src/domain/services/storage.ts`)
- Slices: `ui`, `staffs`, `tasks`, `dependencies`.
- Store persists `{ ui, staffs, tasks, dependencies }` (debounced) via `StorageLike` (localStorage or Electron sync IPC).
- Preload exposes `window.cadence.storageSync` for Electron builds.

Renderer Architecture
- `PixiApplication` (`src/renderer/core/PixiApplication.ts`): Initializes Pixi; enforces WebGPU availability (shows overlay if missing). Manages layered containers and safe cleanup; exposes stats.
- `ViewportManager` (`src/renderer/core/ViewportManager.ts`): Centralized world↔screen math, left margin handling, visible bounds, snap/fit/animate helpers.
- `ErrorBoundary` (`src/renderer/core/ErrorBoundary.ts`): Severity-graded error logging, safe wrappers for Pixi ops, health checks, retry/degrade helpers, perf monitoring.

State Model & Selectors
- `ui` (`src/state/ui.ts`): `viewport {x,y,zoom}`, `verticalScale`, `sidebarWidth`, `selection`, `selectionAnchor`.
- `tasks` (`src/state/tasks.ts`): CRUD updates for tasks.
- `staffs` (`src/state/staffs.ts`): CRUD/reorder; sort by `position`.
- `dependencies` (`src/state/dependencies.ts`): Simple list of dependency edges.
- Selectors (`src/state/selectors/*`):
  - Tasks: grouping/sorting/visible selection/conflicts.
  - Dependencies: joined with tasks, independent/blocking tasks, critical path (longest chain; simplified).
  - Analytics: project time bounds, completion stats, staff utilization/workload.

APIs
- Renderer API (`src/types/renderer.ts` → `IRenderer` implemented by `Renderer`):
  - Data/viewport: `setData(...)`, `setViewport(...)`, `setVerticalScale(...)`, `getHeaderHeight()`, `getSidebarWidth()`.
  - Hit-testing: `hitTest(x,y)`, `getTaskRect(id)`, `getMetrics()`.
  - UI: `setActions(...)`, `openStaffManager()`, `handleUIAction(key)`, `hitTestUI(x,y)`.
  - Interaction visuals: `drawDragPreview(...)`, `clearPreview()`, `drawDependencyPreview(...)`, `clearDependencyPreview()`.
- Command API (`src/runtime/commands.ts`):
  - Command IDs: `'zoom.in' | 'zoom.out' | 'zoom.reset' | 'selection.clear'`.
  - Registry wires to store; zoom anchors at canvas center.
- Preload/Electron bridge (`src/preload/index.ts`):
  - `window.cadence.version: string`.
  - `window.cadence.storageSync.getItem/setItem(key,value)` for sync persistence.
  - `window.cadence.onCommand(handler)` to receive menu commands.
- Storage service (`src/domain/services/storage.ts`):
  - Auto-detects Electron bridge; falls back to `localStorage` in browser.
- Path aliases (see `tsconfig.json`): `@renderer/*`, `@runtime/*`, `@state/*`, `@types/*`, `@domain/*`, `@shared/*`, `@config`.

File-by-File Map

Project config and build
- `package.json`: Scripts, dependencies, electron-builder config.
- `vite.config.ts`: Vite root `src`, build outputs, Electron entries (main/preload), path aliases.
- `tsconfig.json`, `tsconfig.node.json`: Strict TS config, bundler resolution, aliases, includes.

Entry points and HTML/CSS
- `src/index.html`: App shell; loads `runtime/bootstrap.ts` and `src/styles/ui.css`.
- `src/styles/tokens.css`: Theme tokens (colors, spacing, typography, transitions); dark/light/high-contrast.
- `src/styles/base.css`: Global base styles and background.
- `src/styles/layout.css`: App container, content, sidebar/main, canvas sizing.
- `src/styles/ui.css`: Imports tokens/base/layout.

Electron
- `src/main/index.ts`: App lifecycle, window creation, WebGPU flags, secure `webPreferences`, load URL/file with retry/fallback, menu → IPC, file-backed kv storage using `app.getPath('userData')`.
- `src/preload/index.ts`: Safe `contextBridge` for version, sync storage, and `onCommand` subscription.

Runtime wiring and interactions
- `src/runtime/bootstrap.ts`: DOM/canvas setup, `Renderer` init, store sync/RAF scheduling, pointer events, keyboard, IPC command registry.
- `src/runtime/bindRendererActions.ts`: Plugs Redux actions into `Renderer.setActions`.
- `src/runtime/keyboard.ts`: Keyboard to commands mapping.
- `src/runtime/commands.ts`: Command registry (zoom/selection).
- `src/runtime/demo/seedData.ts`: Dev seed for staffs/tasks.
- `src/runtime/interactions/eventHandlers.ts`: Pointer router; UI hit test first; launches FSMs for dep-link/move/resize/pan; sidebar resize; selection/click semantics.
- `src/runtime/interactions/taskOperations.ts`: Core operations (create/move/resize tasks, create dependencies) and calculations (availability, snapping, duration from resize).
- `src/runtime/interactions/fsm/dragPan.ts`: Pan math using `pixelsPerDay`.
- `src/runtime/interactions/fsm/moveTask.ts`: Move preview/commit with grid/staff snapping and min-allowed-day from dependencies.
- `src/runtime/interactions/fsm/resizeTask.ts`: Resize preview/commit from screenX → world days.
- `src/runtime/interactions/fsm/linkDependency.ts`: Dependency preview/commit.
- `src/runtime/interactions/fsm/selection.ts`: Click/modified-click selection toggling.

Renderer core and utilities
- `src/renderer/core/PixiApplication.ts`: Pixi app lifecycle, layers (viewport/background/dependencies/tasks + UI), WebGPU check/overlay, safe cleanup, stats, viewport transform.
- `src/renderer/core/ViewportManager.ts`: Viewport state; left margin; world↔screen; visible bounds; pan/zoom/snap/fit/animate.
- `src/renderer/core/ErrorBoundary.ts`: Error logging, safe ops wrappers, retries, degradation hooks, perf monitors, health checks.
- `src/renderer/core/Renderer.ts`: Orchestrator combining grid/tasks/dependencies/effects/UI; maintains hover/layout/metrics; preview drawing; UI action handling; color cache bridge.

Render passes and primitives
- `src/renderer/passes/GridPass.ts`: Background grid + staff lines; measure/today markers; hover effects; dependency curves; helper metrics.
- `src/renderer/passes/TaskPass.ts`: Task render (note head, duration track, label/mast, glyphs); layout calculation; cache management; drag/dep previews.
- `src/renderer/passes/EffectsPass.ts`: Gradients, streaks, particles; animations (flash/ripple/pulse) and stats.
- `src/renderer/primitives/grid.ts`: Grid/staff line drawing helpers.
- `src/renderer/primitives/markers.ts`: Today marker and measure-pair primitives.
- `src/renderer/primitives/tasks.ts`: Status colors, glow colors, note-head/track and label rendering.

UI (Pixi)
- `src/renderer/ui/HeaderRenderer.ts`: Date header height and VM; month/day/hour labels and ticks; today marker in header.
- `src/renderer/ui/SidebarRenderer.ts`: Sidebar background, staff labels, resize grip; hit-test rects.
- `src/renderer/ui/ToolbarRenderer.ts`: Add/Manage/Link buttons; hit-test rects.
- `src/renderer/ui/TooltipRenderer.ts`: Tooltip near hover point; follows mouse; stem to note head; safe cleanup.
- `src/renderer/ui/ModalRenderer.ts`: Host for modals; hit-test rects; temp state for staff manager.
- `src/renderer/ui/modals/StaffManagerModal.ts`: Staff CRUD/reorder/line count controls.
- `src/renderer/ui/modals/TaskDetailsModal.ts`: Task title/status/start/duration/staff/line controls.
- `src/renderer/ui/TextInputManager.ts`: Hidden text input for in-place edits; commits on blur/enter.
- `src/renderer/ui/DebugOverlay.ts`: FPS/draw calls/task counts overlay.

Time and date helpers
- `src/renderer/timeScale.ts`: Zoom → time scale selection (hour/day/week/month) and thresholds.
- `src/renderer/dateHeader.ts`: Compute header VM (labels/ticks) with UTC-safe month math.
- `src/renderer/timelineMath.ts`: Zoom clamps, pixels-per-day, world↔screen conversions, anchor-zoom, project day index conversions, staff vertical geometry, scaled timeline.
- `src/renderer/utils/index.ts`: Re-exports timeline helpers for convenience.
- `src/renderer/timelineConfig.ts`: Deprecated re-export of `shared/timeline`.

State, domain, and shared
- `src/state/store.ts`: Redux store config, persist/load with versioning and debounce.
- `src/state/ui.ts`: UI slice and reducers for selection/viewport/vertical scale/sidebar width.
- `src/state/staffs.ts`: Staffs slice with CRUD and reorder.
- `src/state/tasks.ts`: Tasks slice with CRUD.
- `src/state/dependencies.ts`: Dependencies slice with CRUD.
- `src/state/selectors/index.ts`: Barrel export for selectors.
- `src/state/selectors/tasks.ts`: Task selectors (grouping/sorting/visible/selected/conflicts).
- `src/state/selectors/dependencies.ts`: Dependencies joined with tasks; independent/blocking; critical path.
- `src/state/selectors/analytics.ts`: Project bounds, completion stats, staff utilization/workload.
- `src/domain/services/storage.ts`: `StorageLike` implementations and auto-detection.
- `src/shared/timeline.ts`: Global timeline constants (day width, margins, spacings).
- `src/shared/colors.ts`: CSS variable → Pixi hex color cache and helpers.
- `src/shared/geom.ts`: Rect hit testing and helpers.

Types
- `src/types/index.ts`: Core domain types (Project/Task/Staff/Dependency, enums). Re-exports renderer types.
- `src/types/renderer.ts`: `IRenderer` interface and related types for actions/metrics/rects.
- `src/types/global.d.ts`: Global `window.cadence` type definitions.

Misc
- `scripts/check-date.js`: Small local test that validates day-index math and `worldDaysToScreenX`.
- `docs/Mockup.jpg`: Visual reference mockup.

Design Notes & Trade-offs
- WebGPU-first rendering: The app displays an overlay if WebGPU is not available (`PixiApplication.initialize`). This keeps the rendering path modern and performant.
- Renderer-as-UI: All UI (header/sidebar/toolbar/modals/tooltip) is drawn in Pixi to avoid DOM/CSS/layout costs and maintain perfect visual alignment with the canvas content.
- Interaction FSMs: Pan/move/resize/dependency-link/selection isolated per FSM keeps `eventHandlers` simple and testable; FSMs produce previews and commit via store-backed operations.
- Safe ops wrappers: All heavy draw calls are protected by `safePixiOperation`. Errors log with severity and can be downgraded or retried gracefully.
- Left margin as first-class: Sidebar width is state-driven and injected into timeline/world↔screen math so everything stays aligned as the UI changes.

Known Issues / Follow-ups
- `src/renderer/ui/ToolbarRenderer.ts` uses placeholder glyphs for buttons that may render as mojibake on some systems. Consider replacing with crisp vector icons or text labels.
- `src/renderer/ui/TooltipRenderer.ts` composes the info line with a non-ASCII separator (`A�` in some encodings). Swap for a standard en dash (`–`) or `·` for clarity.
- WebGPU requirement is strict; if a compatibility fallback is desired, add a WebGL2 pathway (non-trivial) or preflight environment checks in the Electron main process.

Contributing
- Ensure `npm run typecheck` passes; keep changes focused and consistent with existing style.
- Favor small, composable modules and reuse primitives/passes.
- File-by-file map above is the authoritative index—update it if you add/rename files.

License
MIT
=======
>>>>>>> main
