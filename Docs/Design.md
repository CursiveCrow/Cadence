# Cadence — Engineering Design & Implementation Specification (Revised)

A streamlined, high-performance, offline-first project management system using Electron, TypeScript, React, PixiJS, and CRDTs.

---

## Executive Summary

- Runtime: Electron (desktop-first). Core logic is portable to a future web SPA.
- Architecture: Unidirectional data flow for UI state, with Yjs as the Single Source of Truth (SSoT) for project data.
- UI: React 18/19 + PixiJS (WebGL2) for the timeline canvas.
- Data & Offline-First: Yjs manages all active project data. Persistence uses SQLite WASM (via OPFS) in the renderer.
- State Management: Redux Toolkit (RTK) for global UI state (viewport, selection).
- Undo/Redo: Y.UndoManager.
- Performance: Target 60fps via OffscreenCanvas, virtualization, and spatial indexing.

---

## Goals and Scope

- Desktop-first application with a fluid, high-FPS (60fps) custom timeline visualization.
- Offline-first interactions that are instantaneous and durable.
- Ready for real-time collaboration via CRDT foundation.
- Unified codebase minimizing differences between Electron and Web builds.
- Robust dependency management with DAG validation and intuitive lane assignment.

---

## Domain Vocabulary

- Project (Score): Root container.
- Task (Note): Unit of work (`title`, `startDate`, `durationDays`, `status`, `assignee`, `laneIndex`).
- Milestone (Measure): A collection aiding temporal grouping.
- Dependency: Directed edge between tasks (A → B), typically Finish-to-Start.
- Lane: Horizontal track on the canvas; chains stay together or nearby.

---

## Architecture Overview

Renderer (Electron/Web)

- UI Layer: React components, menus, sidebars
- Canvas: PixiJS running with OffscreenCanvas (preferably in a Worker)
- State & Domain: RTK for UI; Yjs (SSoT) for project data
- Persistence: SQLite WASM with OPFS

Main (Electron)

- Minimal IPC surface for dialogs, file ops, and app lifecycle

---

## Data Model & Persistence

Y.Doc per Project

- `tasks: Y.Map<TaskData)`
- `dependencies: Y.Map<DependencyData>`
- `settings: Y.Map<unknown>`

SQLite schema (renderer/OPFS)

- `crdt_updates (doc_id, clock, update_data)`
- `crdt_snapshots (doc_id, snapshot_data)`

---

## UI State vs. Project Data

- RTK: Ephemeral UI state (viewport, selection, activeProjectId)
- Yjs: Authoritative project data (tasks, dependencies)

---

## Monorepo & Build

- pnpm workspaces + Turborepo
- Per-package `tsconfig.json` extending root `tsconfig.base.json`
- Emit to `dist/` with declarations
- Path aliases via `tsconfig` and `vite-tsconfig-paths`
- Jest (or Vitest) for tests; jsdom for React

---

## Security

- Electron `contextIsolation: true`, `sandbox: true`
- Minimal, validated IPC channel surface
- CSP for production builds
- Sanitization via DOMPurify (recommended) for any HTML content

---

## Performance

- OffscreenCanvas + PixiJS
- Spatial indexing and virtualization
- Background workers when beneficial

---

## Notes

- This revision removes encoding artifacts and standardizes text. See repo README for scripts and usage.

