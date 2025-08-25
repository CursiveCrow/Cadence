# Cadence — Engineering Design & Implementation Specification (Revised)

**_A streamlined, high-performance, offline-first project management system using Electron, TypeScript, React, PixiJS, and CRDTs._**

This revision simplifies the architecture by adopting idiomatic state management, establishing the CRDT (Yjs) as the Single Source of Truth (SSoT), and unifying the persistence layer for desktop and future web targets. It also standardizes the domain vocabulary for improved usability.

---

## 0) Executive Summary

- **Runtime:** **Electron** (desktop-first). The architecture is unified so the core application logic and persistence layer can be reused directly in a future web SPA.
- **Architecture:** **Unidirectional Data Flow** for UI state, integrated with a **CRDT (Yjs)** as the Single Source of Truth (SSoT) for project data.
- **UI:** React 19 + **PixiJS (WebGL2)** for the timeline canvas, integrated using `@pixi/react`.
- **Data & Offline-First:** **Yjs** manages all active project data. Persistence uses **SQLite WASM (via OPFS)** directly in the renderer process, eliminating IPC latency and unifying the data architecture.
- **State Management:** **Redux Toolkit (RTK)** manages global UI state (e.g., viewport, selection).
- **Undo/Redo:** Managed by the built-in `Y.UndoManager`, eliminating complex custom command sourcing.
- **Performance:** Target 60 fps. Achieved via mandatory **OffscreenCanvas**, virtualization, and spatial hashing.

---

## 1) Goals and Scope

### 1.1 Goals

- Desktop-first application with a fluid, high-FPS (≥60) custom timeline visualization.
- **Offline-first** capability where all actions are instantaneous and durable.
- Readiness for future real-time collaboration via CRDT foundation.
- **Unified codebase** minimizing differences between Electron and future Web builds.
- Robust dependency management with DAG validation and intuitive lane assignment.

### 1.2 Non-goals (MVP)

- Mobile applications.
- Cloud synchronization services (the data layer is ready, but the backend service is out of scope).

---

## 2) Domain Vocabulary (Standardized)

- **Project (Score):** The root container. (`startDate`, `endDate`, `name`).
- **Task (Note):** A unit of work. (`title`, `startDate`, `durationDays`, `status`, `assignee`, `laneIndex`).
- **Milestone (Measure):** A series of notes that create a timeline.
- **Dependency:** A directed edge between tasks (A→B), typically Finish-to-Start.
- **Lane:** The horizontal track on the canvas. The system attempts to keep dependent chains in the same lane or in adjacent lanes.

---

## 3) Architecture Overview

### 3.1 Unified Architecture

The architecture treats the Electron Renderer process identically to a modern web browser environment. This simplifies data access and maximizes code reuse by minimizing the role of the Electron Main process.

```mermaid
flowchart TD
  subgraph Renderer Process [Electron Renderer / Web Browser]
    subgraph UI Layer
      R[React (Menus, Sidebars)]
      P[PixiJS Canvas (via Worker)]
    end

    subgraph State & Domain
      S[Zustand/RTK (UI State: selection, viewport)]
      Y[Yjs (CRDT SSoT: Tasks, Dependencies)]
    end

    subgraph Persistence
      SQLW[SQLite WASM + OPFS]
    end
  end

  subgraph Worker Thread
      OC[OffscreenCanvas (PixiJS Context)]
      SI[Spatial Index & Layout]
  end

  subgraph Main[Electron Main Process]
    IPC[Native APIs (FS access for Import/Export, Updater)]
  end

  R -- Reads UI State --> S
  R -- Reads Project Data (Observable Hook) --> Y

  R -- Mutates Project Data (Transaction Function) --> Y

  Y-- Persists/Hydrates -->SQLW
  Renderer-- Minimal, Validated IPC -->Main

  P -- Canvas Proxy --> OC
  OC <--> SI
```

### 3.2 Key Architectural Principles

1.  **CRDT as SSoT:** The Yjs document (YDoc) is the authoritative data model.
2.  **Unified Persistence:** Using SQLite WASM/OPFS in the renderer eliminates IPC data latency and unifies the persistence layer for Electron and Web.
3.  **Pragmatic State Management:** Adopting RTK. UI state is kept separate from project data.
4.  **Simplified Undo/Redo:** Utilize the built-in `Y.UndoManager`.
5.  **Performance Isolation:** The high-FPS canvas runs in a Worker via OffscreenCanvas, protecting it from main thread contention.

### 3.3 Monorepo Layout (pnpm workspaces)

```
cadence/
  apps/
    desktop/                # Electron main/preload + Renderer (Vite)
    web/                    # Future SPA
  packages/
    core/                   # Domain types, algorithms (DAG, lanes), validation
    state/                  # RTK Stores (UI state)
    crdt/                   # Yjs initialization, persistence providers, mutation functions, hooks
    renderer/               # PixiJS implementation, Worker setup, OffscreenCanvas, spatial index
    platform-services/      # Interfaces/implementations for FS access, dialogs (Electron IPC/Web APIs)
    ui/                     # Reusable React UI components
```

---

## 4) Technology Selections (Mandates)

- **Electron**: Latest LTS; strict security (`contextIsolation: true`, `sandbox: true`).
- **UI**: React 19 + Vite.
- **Canvas Rendering**: PixiJS (WebGL2). Mandatory use of **OffscreenCanvas**. Integration via **`@pixi/react`**.
- **State Management**: **Redux Toolkit (RTK)**.
- **Data Model (SSoT)**: **Yjs**.
- **Persistence**: **SQLite WASM** (e.g., `@sqlite.org/sqlite-wasm`) utilizing the Origin Private File System (OPFS) backend.
- **Validation**: **Zod** for IPC payloads and Import/Export formats.

---

## 5) Data Model & Persistence

The Single Source of Truth (SSoT) for active project data is the Yjs document. SQLite is used only for persistence of the CRDT data and high-level metadata.

### 5.1 CRDT Document (YDoc - SSoT)

One YDoc per Project.

```typescript
// YDoc Structure
YDoc {
  // Map<TaskId, TaskData>
  tasks: Y.Map<TaskData>,
  // TaskData = { id, title, startDate, durationDays, status, assignee, laneIndex }

  // Map<DependencyId, DependencyData>
  dependencies: Y.Map<DependencyData>,
  // DependencyData = { id, srcTaskId, dstTaskId }

  settings: Y.Map<unknown>
}
```

### 5.2 Persistence Layer (SQLite WASM/OPFS)

The schema focuses on storing CRDT data efficiently.

```sql
-- High-level project metadata (for the launcher screen)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  last_opened TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CRDT Persistence: Stores the Yjs update stream sequentially
CREATE TABLE IF NOT EXISTS crdt_updates (
  doc_id TEXT NOT NULL,      -- Project ID
  clock INTEGER NOT NULL,
  update_data BLOB NOT NULL, -- Raw Yjs update message
  PRIMARY KEY (doc_id, clock)
);

-- CRDT Snapshots: For optimized loading of large projects
CREATE TABLE IF NOT EXISTS crdt_snapshots (
  doc_id TEXT PRIMARY KEY,
  snapshot_data BLOB NOT NULL
);
```

---

## 6) State Management (UI State vs. Project Data)

We maintain a clear separation: Project Data (authoritative in Yjs) and UI State (managed by Zustand/RTK).

### 6.1 UI State

Manages ephemeral UI concerns.

```typescript
// Example UI State Shape
interface UIState {
  activeProjectId: string | null;
  selection: string[]; // Array of selected Task IDs
  viewport: { x: number; y: number; zoom: number };
}
```

### 6.2 Project Data Mutations (Write Path)

Mutations happen directly on the YDoc via dedicated service functions. We do not route domain actions through the UI state manager.

```typescript
// packages/crdt/src/mutations.ts
export function moveTask(
  projectId: string,
  taskId: string,
  newStartDate: string
) {
  const ydoc = getProjectDoc(projectId);

  // All mutations must occur within a transaction
  ydoc.transact(() => {
    const tasks = ydoc.getMap<TaskData>("tasks");
    const task = tasks.get(taskId);

    // Domain validation (e.g., DAG check) occurs here before mutation
    // if (!isValidMove(ydoc, taskId, newStartDate)) return;

    if (task) {
      tasks.set(taskId, { ...task, startDate: newStartDate });
    }
  }, "local"); // 'local' origin is crucial for UndoManager tracking
}
```

### 6.3 Consuming Project Data (Read Path)

We do not replicate the YDoc into the UI state store, as this is inefficient. Instead, we use custom React hooks to observe the YDoc and re-render components when data changes.

```typescript
// packages/crdt/src/hooks.ts
// Simplified example hook (optimization needed for production, e.g., using useSyncExternalStore)
export function useProjectTasks(projectId: string) {
  const ydoc = getProjectDoc(projectId);
  const [tasks, setTasks] = useState({});

  useEffect(() => {
    const tasksMap = ydoc.getMap("tasks");
    const observer = () => {
      // Convert YMap to plain JS objects for React consumption
      setTasks(tasksMap.toJSON());
    };
    tasksMap.observe(observer);
    observer(); // Initial load
    return () => tasksMap.unobserve(observer);
  }, [ydoc]);

  return tasks;
}
```

### 6.4 Undo/Redo

Custom command sourcing is replaced by `Y.UndoManager`. This correctly handles the complexities of CRDTs and future collaboration.

---

## 7) Rendering Pipeline & Performance

The goal is a consistent 60 FPS. This requires isolating the rendering process from the main thread.

### 7.1 OffscreenCanvas and Workers (Mandatory)

- **Main Thread:** Handles React, state management, Yjs updates, and user input routing.
- **Rendering Worker:** A dedicated Web Worker holds the PixiJS Application instance and the WebGL context via `OffscreenCanvas`.

### 7.2 Layout and Hit-Testing

- The worker maintains a **Spatial Index** (e.g., a Spatial Hash or Quadtree) of all tasks and dependency connectors.
- The Layout Algorithm (Lane Assignment) runs in the worker.
- Hit-testing (determining which object is clicked) occurs entirely within the worker. Input events are proxied from the main thread.

### 7.3 Optimization Strategies

- **Virtualization (Culling):** Only render elements within the current viewport (plus a buffer).
- **`@pixi/react`:** Use for declarative management of the Pixi stage on the main thread, simplifying the integration with the canvas (even when rendering offscreen).
- **Batching:** Utilize PixiJS's built-in batching for geometry.

---

## 8) Domain Algorithms

These algorithms are pure functions operating on the project data structure.

- **DAG Validation (Cycle Detection):** Before committing a `moveTask` or `addDependency` transaction, perform a Depth First Search (DFS) on the dependency graph to ensure the change does not introduce a cycle.
- **Lane Assignment:** Algorithm to minimize vertical movement.
  1. Perform a topological sort of the dependency graph.
  2. Iterate through sorted tasks, attempting to place the task in the same lane as its immediate predecessor.
  3. If the lane is occupied, find the nearest available lane.

---

## 9) Platform Integration & Security

We isolate platform-specific operations (File System I/O for import/export, Native Dialogs, Updates) behind a service interface in `platform-services`.

### 9.1 Unified Data Access

Since SQLite WASM/OPFS is used in the renderer, the data access layer is identical for desktop and web.

### 9.2 Native Platform Services (via IPC)

For Electron, OS-level services are accessed via IPC.

- **Security:** Maintain `contextIsolation: true` and `sandbox: true`.
- **Preload Script:** Exposes a narrow, versioned API (e.g., `window.api.v1.fs.showSaveDialog`). The required IPC surface is minimal as data access does not cross the process boundary.
- **IPC Validation:** All IPC payloads must be validated using Zod in the Main process before execution. The Main process contains no domain logic.

---

## 10) Implementation Plan (Revised & Realistic)

### Phase 0 — Architecture Spike & Risk Mitigation (1 week)

1.  **Monorepo Setup:** Initialize pnpm/Turborepo, Electron, Vite, React.
2.  **Rendering PoC (Crucial):** Implement PixiJS with `OffscreenCanvas` in a Web Worker. Implement basic spatial hashing.
    _Done when:_ PoC renders 5000+ interactive static elements at ≥60 fps during panning/zooming.
3.  **Persistence PoC:** Validate SQLite WASM + OPFS integration within the Electron renderer. Implement the custom Yjs persistence provider.
    _Done when:_ Yjs data persists across application restarts in the Electron build.

### Phase 1 — Walking Skeleton

1.  **State Management Setup:** Configure RTK for UI state.
2.  **Yjs/React Integration:** Initialize YDoc, define schema, implement mutation functions and observable hooks.
3.  **End-to-End "Add Note":** Implement the ability to add a Note via the UI, mutate the YDoc, observe the change, and render it on the canvas (via the worker).
4.  **Undo/Redo:** Wire up `Y.UndoManager`.
    _Done when:_ Tasks can be added, moved, persisted, and undone.

### Phase 2 — Core Features and Logic

1.  **Dependencies:** Implement dependency linking (A→B).
2.  **Domain Algorithms:** Implement DAG validation (cycle detection).
3.  **Layout:** Implement the Lane Assignment algorithm within the rendering worker.
    _Done when:_ Cycles are prevented, and tasks automatically arrange themselves logically.
4.  **Note Editing:** Implement sidebar/modal for editing note details (title, status, assignee).

### Phase 3 — Polish and Packaging

1.  **Performance Optimization:** Implement virtualization/culling. Fine-tune the Spatial Hash for optimized hit-testing.
2.  **Platform Integration:** Implement Import/Export (Project Bundle JSON) using the Platform Service layer (IPC).
3.  **A11y:** Implement keyboard navigation parity and Screen Reader support.
4.  **Packaging:** Configure `electron-builder`, code signing, and set up auto-updates.
