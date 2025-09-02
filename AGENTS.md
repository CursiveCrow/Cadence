## Cadence Architecture & Contribution Guide (for Humans and Agents)

### Core Principle

Every file must have exactly one responsibility. Any file over 500 lines must be evaluated for violating this rule and refactored as needed.

### High-Level Architecture

Cadence uses Hexagonal/Clean Architecture with feature-oriented modules. Business logic is isolated behind ports; technical details live in adapters. The UI and renderer consume application use-cases, never infrastructure directly.

### Monorepo Structure

```
apps/
  desktop/                  # Electron bootstrap (shell only)
  web/                      # Web bootstrap (Vite shell only)

packages/
  domain/                   # Pure domain model (no side effects)
    src/
      staff/
      task/
      timeline/
      common/

  application/              # Use-cases (CQRS), policies, domain events, ports
    src/
      staff/
      task/
      timeline/
      ports/                # Interfaces only
        PersistencePort.ts
        RendererPort.ts
        PlatformPort.ts
        TelemetryPort.ts

  adapters/                 # Technical implementations (implement ports)
    persistence/
      yjs/
      memory/
      fs/
    platform/
      electron/
      web/
    telemetry/
      console/
      opentelemetry/

  renderer/                 # Rendering engine (bounded context)
    core/
    plugins/

  surface/                  # React UI (ephemeral state and wiring)
    components/             # Presentational
    containers/             # Hooks + use-cases
    features/
      staffs/
      tasks/
      timeline/
    state/                  # UI-only state (e.g., selection, viewport)

  shared/                   # Cross-cutting types, zod schemas, utils, design tokens
  config/                   # tsconfig base, build configs, env
```

### Layering Rules (Enforced)

- domain depends on nothing
- application depends on domain and application/ports
- adapters implement application/ports and may depend on application types (DTOs) but not on UI
- renderer exposes `RendererPort` and does not depend on UI or adapters
- surface (UI) depends on application and shared only; it must not import adapters directly
- apps select and wire adapters to ports at composition root (bootstrap)

Forbidden examples:

- UI importing persistence adapter code directly
- Domain importing anything from application/adapters/surface

### Ports (Interfaces)

Define side-effect boundaries as ports in `application/ports`:

- PersistencePort: project snapshots, mutations, subscriptions
- RendererPort: initialize, resize, render, event bridge
- PlatformPort: dialogs, clipboard, paths, window ops
- TelemetryPort: tracing, metrics, structured logs

Example:

```ts
// application/ports/PersistencePort.ts
export interface PersistencePort {
  loadProject(projectId: string): Promise<ProjectSnapshot>
  mutate(mutation: ProjectMutation): Promise<void>
  subscribe(onChange: (snapshot: ProjectSnapshot) => void): Unsubscribe
}
```

### Use-Cases (CQRS)

- Each command/query is a single file, pure function with injected ports
- Names: `createTask`, `moveTaskOnTimeline`, `getTasksForRange`
- Inputs/outputs are explicit DTOs validated with zod or TS types

Example:

```ts
// application/task/createTask.ts
export type CreateTaskInput = {
  projectId: string
  staffId: string
  title: string
  start: number
  end: number
}
export const createTask = (persistence: PersistencePort) => async (input: CreateTaskInput) => {
  const mutation: ProjectMutation = { type: 'create-task', payload: input }
  await persistence.mutate(mutation)
}
```

### State Model

- Persistent state (project data): source of truth behind `PersistencePort` (e.g., Yjs CRDT)
- Ephemeral UI state: kept in `surface/state` (selection, viewport, hover, popovers)
- Domain events: emitted from application; UI and renderer subscribe via an in-memory event bus adapter

### Renderer Integration

- Renderer is a bounded context in `packages/renderer`
- Expose a minimal `RendererPort` used by application/UI
- Plugins register via typed hooks: `onInit`, `onResize`, `onTick`, `onEvent`
- No UI imports inside renderer

### Platform Abstractions

- `PlatformPort` for OS-specific features (file dialogs, paths, window)
- Implementations in `adapters/platform/electron` and `adapters/platform/web`
- Composition roots in `apps/desktop` and `apps/web` choose the adapter set

### Testing Strategy

- Domain: pure unit tests (no mocks)
- Application: use-case tests with fake ports; scenario-style Given/When/Then
- Adapters: contract tests per port definition
- Renderer: plugin snapshot/golden tests (deterministic RNG)
- Surface: component tests; Storybook stories wired to real use-cases

### Documentation & Governance

- ADRs in `docs/adr/NNN-title.md` for architectural decisions
- C4 diagrams for Context/Container/Component
- Dependency rules enforced via tooling (e.g., dependency-cruiser) to prevent layer leaks
- Typedoc for ports and use-case contracts

### Conventions (LLM-Friendly)

- Small files, single responsibility (target 200–300 lines, hard cap 500)
- Stable naming: verbNoun for use-cases; `getX`, `listX`, `createX`
- Explicit data contracts with zod/TS DTOs
- No hidden globals; side effects only through ports
- Barrel files only for re-exports; avoid cycles

### Non-Negotiables

- Single responsibility per file
- No direct UI → adapter imports
- No domain → application/adapter/surface imports
- No unvalidated external inputs; validate at use-case boundaries
