# Cadence System Prompt for Coding Agents

You are an LLM working on the Cadence app. Your top priority is to preserve the clean architecture of the project while implementing changes with surgical precision. Read and follow these explicit rules before you propose or make any change.

## Canonical Architecture (Do Not Deviate)

- `src/` is the single source of truth:
  - `src/main` — Electron main process (direct Electron API; minimal IPC).
  - `src/preload` — Preload script (contextIsolation on; tiny surface).
  - `src/state` — Redux Toolkit slices and store (single source of truth).
  - `src/styles` — centralized styles and theming (tokens.css, base.css, utilities.css, layout.css, date-header.css, sidebar.css, task-details.css, modals.css, staff-manager.css).
  - `src/renderer` — PixiJS v8.13 renderer (single class; no extra layers).
  - `src/types` — domain types for Project/Task/Staff/etc.
  - `src/config` & `src/utils` — small shared helpers only.
- State management: Redux Toolkit only (`ui`, `staffs`, `tasks`, `dependencies`).
  - Persistence: simple localStorage/file JSON; no CRDT, no Yjs.
- Renderer: `src/renderer/Renderer.ts` draws grid, staffs, tasks, dependencies.
  - One class using PixiJS v8.13 (Application with minimal Containers and Graphics). No engine/scene/dnd layers.
  - The canvas starts flush with the app sidebar (no internal left gutter).
- Date header: implemented in Pixi (sliding months/days/hours bands) via `src/renderer/dateHeader.ts`, rendered in `Renderer.drawHud`. It must align with the canvas and respect the sidebar width.
- Electron: direct APIs in `src/main/index.ts`; minimal IPC; no platform abstraction.
- Build: Vite root is `src`; `vite-plugin-electron` entries are `main/index.ts` and `preload/index.ts`.

## Hard “Do Not” Rules

- Do not re‑introduce over‑abstractions: ports/adapters, dependency injection frameworks, or “ApplicationPortsContext”.
- Do not add CRDTs/Yjs or any CRDT‑style sync. The single source of truth is Redux.
- Do not re-add `rendererPort`, engine/scene/manager stacks.
- Do not add heavy rendering libraries without explicit maintainer approval.
- Do not change entry points (`src/index.html` -> `/main.tsx`; Electron entries as above).
- Do not change tsconfig path aliases or Vite root without approval.
- Do not introduce non-existent assets in HTML (e.g., `/assets/icon.png`).
- Do not add new top‑level packages or monorepo structure.
- Do not inline styles in components; use the centralized styles in `src/styles`.

## Strong Preferences

- Be minimal and surgical; fix root causes, not symptoms.
- Maintain the current file layout and naming; avoid churn.
- Ask clarifying questions before structural changes; propose a plan.
- Keep dependencies small; any new dependency requires explicit justification.
- Favor simple PixiJS v8.13 Graphics and straightforward React v18.2.0 over frameworks or meta-architectures.

## Change Process

- Always outline a brief plan (phased, verifiable steps) before edits.
- Keep UI behavior visually consistent unless the task is explicitly to change it.
- When touching renderer or header alignment, verify:
  - Sidebar and canvas share a single boundary (no duplicate gutter).
  - Date header ticks/labels align with canvas grid and slide bands correctly.
- Validate with: `tsc --noEmit` and `vite build`. Avoid introducing console warnings/errors.

## Definition of Done

- Typecheck passes; Vite build succeeds; Electron window opens without fatal errors.
- No duplicate sidebars; date header alignment correct at various zooms.
- No new architectural layers; simplified structure intact.
- Docs updated if behavior or structure changes.

## Safe Areas to Modify

- Add/extend Redux slices under `src/state`.
- Improve `src/renderer/Renderer.ts` with small, testable functions (no new layers).
- Extend timeline header logic in `src/renderer/dateHeader.ts` if needed.
- Add tiny helpers to `src/utils` or `src/config` as needed.

## Red Flags — Stop and Ask First

- Any new abstraction/adapter layer; any attempt to generalize platform or renderer.
- Swapping rendering backends or introducing a scene graph.
- Changing Vite/Electron entry points or folder layout.
- Adding networked or collaborative state.

## Quick Checklist Before You Merge

- Architecture preserved (see Canonical Architecture).
- No duplicate left gutter; sidebar owns the left column; canvas starts at its edge.
- Date header bands slide correctly (months/days/hours) and align with canvas.
- Redux only; no Yjs/ports/adapters/DI; no “index.tsx” entry regressions.
- `npm run dev` works; `npx vite build` and `npm run electron` run without errors.

Adhering to this prompt protects the project’s clean, elegant structure. When in doubt, stop, ask, and prefer the simplest solution that works.
