# Cadence Project - Comprehensive Architecture Review

## Executive Summary

After reviewing the Cadence project codebase, I've identified several areas for architectural improvement. The project is an Electron-based desktop application for timeline/task management with a WebGL/WebGPU renderer. While the overall structure shows good organization, there are significant opportunities to improve modularity, reduce complexity, and enhance separation of concerns.

**Key Recommendations:**

- Migrate from Node.js to **Bun 2** for 4-10x performance improvements in build times and runtime
- Upgrade to **React 19.1** to leverage concurrent features, Suspense, and optimistic updates
- Implement **Domain-Driven Design (DDD)** with clear architectural boundaries
- Use **core-centric architecture**: Group `domain` and `use-cases` under `core/` for clarity
- Keep `surface` naming for UI layer (maintaining existing convention)
- Separate concerns between `core`, `infrastructure`, `surface`, and `renderer` layers
- Adopt **CQRS pattern** for better command/query separation

## Current Architecture Analysis

### Strengths

1. **Clear Module Boundaries**: The project uses TypeScript path aliases effectively (`@cadence/core`, `@cadence/renderer`, etc.)
2. **Modern Tech Stack**: React 19.1, Redux Toolkit, PIXI.js v8, TypeScript, Bun 2 runtime
3. **Platform Abstraction**: Good abstraction layer for Electron vs Web environments
4. **Type Safety**: Strong TypeScript usage throughout
5. **Performance**: Bun's fast runtime and built-in tooling capabilities

## Proposed Architecture Refactoring

core/ = Business logic (what the app does)
infrastructure/ = Technical details (how it's implemented)
surface/ = User interface (how users interact)
renderer/ = Canvas visualization (how it's displayed)

### 1. **Domain-Driven Design (DDD) Structure**

```
source/
├── core/                      # All business logic (domain + application orchestration)
│   ├── domain/                # Pure business logic (entities, rules, domain services)
│   │   ├── entities/          # Domain entities with business behavior
│   │   │   ├── Task.ts
│   │   │   ├── Dependency.ts
│   │   │   ├── Staff.ts
│   │   │   └── Project.ts
│   │   ├── value-objects/     # Immutable value objects
│   │   │   ├── TimeRange.ts
│   │   │   ├── TaskStatus.ts
│   │   │   └── TimeSignature.ts
│   │   ├── services/          # Domain services for complex business operations
│   │   │   ├── TaskService.ts
│   │   │   ├── DependencyService.ts
│   │   │   ├── SchedulingService.ts
│   │   │   └── ValidationService.ts
│   │   ├── interfaces/      # Repository interfaces (ports)
│   │   │   └── input/             # Use case interfaces
│   │   │   └── output/            # External service interfaces
│   │   └── events/            # Domain events for decoupled communication
│   │       └── TaskEvents.ts
│   │
│   └── use-cases/             # Application logic orchestration
│           ├── commands/          # Write operations (CQRS pattern)
│           │   ├── CreateTaskCommand.ts
│           │   ├── UpdateTaskCommand.ts
│           │   └── CreateDependencyCommand.ts
│           ├── queries/           # Read operations (CQRS pattern)
│           │   ├── GetTasksQuery.ts
│           │   └── GetDependenciesQuery.ts
│           └── dto/               # Data transfer objects for API boundaries
│               └── TaskDTO.ts
│
├── infrastructure/            # External services and technical implementations
│   ├── persistence/           # Data persistence adapters
│   │   ├── redux/            # Redux store implementation
│   │   └── indexeddb/        # Browser storage implementation
│   ├── platform/             # Platform-specific services
│   │   ├── electron/         # Electron IPC and native features
│   │   └── web/              # Browser-only implementations
│   ├── rendering/            # WebGL/GPU rendering infrastructure
│   │   ├── webgl/
│   │   └── webgpu/
│   └── runtime/              # Bun-specific optimizations
│       └── workers/          # Web Workers for heavy computations
│
├── surface/                   # User interface layer (React 19.1 components)
│   ├── components/           # Presentational React components
│   │   ├── timeline/         # Timeline-specific components
│   │   ├── sidebar/          # Sidebar components
│   │   └── shared/           # Reusable UI components
│   ├── containers/           # Smart components with business logic
│   │   └── TimelineContainer.tsx
│   ├── hooks/                # Custom React 19 hooks (using new features)
│   │   └── UseTaskManagement.ts
│   ├── contexts/             # React contexts for state sharing
│   └── styles/               # CSS modules and styling
│
└── renderer/                  # Canvas rendering engine (PIXI.js abstraction)
    ├── core/                 # Core rendering abstractions
    │   ├── RenderEngine.ts
    │   ├── SceneGraph.ts
    │   └── Viewport.ts
    ├── systems/              # ECS-style rendering systems
    │   ├── RenderSystem.ts
    │   ├── InteractionSystem.ts
    │   └── AnimationSystem.ts
    └── components/           # Visual components for rendering
        ├── TaskRenderer.ts
        ├── GridRenderer.ts
        └── DependencyRenderer.ts
```

### 2. **Implement Clean Architecture Principles**

#### A. **Dependency Inversion**

```typescript
// core/domain/repositories/interfaces/TaskRepository.ts
export interface TaskRepository {
  findById(id: string): Promise<Task>
  findByProject(projectId: string): Promise<Task[]>
  save(task: Task): Promise<void>
  delete(id: string): Promise<void>
}

// infrastructure/persistence/redux/ReduxTaskRepository.ts
export class ReduxTaskRepository implements TaskRepository {
  constructor(private store: Store) {}
  // Implementation details
}
```

#### B. **Use Cases / Command Handlers**

```typescript
// core/use-cases/commands/CreateTaskCommand.ts
export class CreateTaskCommand {
  constructor(
    private taskRepo: TaskRepository,
    private eventBus: EventBus
  ) {}

  async execute(dto: CreateTaskDTO): Promise<Task> {
    // Validation
    const task = Task.create(dto)

    // Business rules
    await this.taskRepo.save(task)

    // Emit events
    this.eventBus.emit(new TaskCreatedEvent(task))

    return task
  }
}
```

### 3. **Refactor State Management**

#### A. **Implement Redux Toolkit with Feature Slices**

```typescript
// infrastructure/persistence/redux/features/
├── tasks/
│   ├── tasksSlice.ts
│   ├── tasksSelectors.ts
│   ├── tasksThunks.ts
│   └── tasksTypes.ts
├── timeline/
│   ├── timelineSlice.ts
│   ├── timelineSelectors.ts
│   └── timelineTypes.ts
└── ui/
    ├── uiSlice.ts
    └── uiSelectors.ts
```

#### B. **Separate UI State from Domain State**

```typescript
// Domain state (persisted)
interface DomainState {
  tasks: TasksState
  dependencies: DependenciesState
  projects: ProjectsState
}

// UI state (ephemeral)
interface UIState {
  selection: SelectionState
  viewport: ViewportState
  modals: ModalsState
}
```

### 4. **Renderer Architecture Refactoring**

#### A. **Entity-Component-System (ECS) Pattern**

```typescript
// renderer/core/Entity.ts
export class Entity {
  id: string
  components: Map<string, Component>
}

// renderer/systems/RenderSystem.ts
export class RenderSystem extends System {
  update(entities: Entity[], deltaTime: number) {
    for (const entity of entities) {
      const renderComponent = entity.getComponent(RenderComponent)
      const transformComponent = entity.getComponent(TransformComponent)
      // Render logic
    }
  }
}
```

#### B. **Separate Rendering Pipeline**

```typescript
// renderer/pipeline/RenderPipeline.ts
export class RenderPipeline {
  private stages: RenderStage[] = [
    new GridRenderStage(),
    new TaskRenderStage(),
    new DependencyRenderStage(),
    new SelectionRenderStage(),
    new UIOverlayStage(),
  ]

  render(context: RenderContext) {
    for (const stage of this.stages) {
      stage.execute(context)
    }
  }
}
```

### 5. **Component Architecture Improvements**

#### A. **Container/Presenter Pattern**

```typescript
// surface/containers/TimelineContainer.tsx
export const TimelineContainer: React.FC = () => {
  const tasks = useAppSelector(selectTasks)
  const dispatch = useAppDispatch()

  const handleTaskUpdate = useCallback((id: string, updates: Partial<Task>) => {
    dispatch(updateTaskCommand({ id, updates }))
  }, [dispatch])

  return <TimelineView tasks={tasks} onTaskUpdate={handleTaskUpdate} />
}

// surface/components/timeline/TimelineView.tsx
interface TimelineViewProps {
  tasks: Task[]
  onTaskUpdate: (id: string, updates: Partial<Task>) => void
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onTaskUpdate }) => {
  // Pure presentation logic
}
```

#### B. **Custom Hooks with React 19.1 Features**

```typescript
// surface/hooks/useTaskManagement.ts
import { use, useOptimistic, useTransition } from 'react' // React 19.1 features

export function useTaskManagement() {
  const dispatch = useAppDispatch()
  const taskService = useTaskService()
  const [isPending, startTransition] = useTransition()

  // React 19's useOptimistic for instant UI updates
  const [optimisticTasks, addOptimisticTask] = useOptimistic(tasks, (state, newTask) => [
    ...state,
    newTask,
  ])

  return {
    createTask: useCallback(
      async (data: CreateTaskDTO) => {
        // Optimistic update for instant feedback
        startTransition(() => {
          addOptimisticTask(data)
        })

        const task = await taskService.create(data)
        dispatch(taskCreated(task))
        return task
      },
      [dispatch, taskService, startTransition, addOptimisticTask]
    ),

    updateTask: useCallback(
      async (id: string, updates: Partial<Task>) => {
        const task = await taskService.update(id, updates)
        dispatch(taskUpdated(task))
        return task
      },
      [dispatch, taskService]
    ),

    isPending, // Expose loading state
  }
}

// Using React 19's 'use' hook for async data
export function useProjectData(projectId: string) {
  // 'use' hook can unwrap promises directly
  const projectPromise = fetchProject(projectId)
  const project = use(projectPromise) // Suspense-enabled data fetching

  return project
}
```

### 6. **Testing Strategy**

#### A. **Unit Testing Structure**

```typescript
// core/domain/__tests__/entities/Task.test.ts
describe('Task Entity', () => {
  it('should calculate end date correctly', () => {
    const task = Task.create({
      startDate: '2024-01-01',
      durationDays: 5,
    })
    expect(task.endDate).toEqual('2024-01-06')
  })
})

// core/use-cases/__tests__/commands/CreateTaskCommand.test.ts
// Using Bun's built-in test runner
import { describe, it, expect, mock } from 'bun:test'

describe('CreateTaskCommand', () => {
  it('should create task and emit event', async () => {
    const mockRepo = createMockTaskRepository()
    const mockEventBus = createMockEventBus()
    const command = new CreateTaskCommand(mockRepo, mockEventBus)

    await command.execute(taskDTO)

    expect(mockRepo.save).toHaveBeenCalled()
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'TaskCreated' }))
  })
})
```

### 7. **Dependency Injection Setup**

```typescript
// infrastructure/di/container.ts
import { Container } from 'inversify'

export const container = new Container()

// Bind repositories
container.bind<TaskRepository>(TYPES.TaskRepository).to(ReduxTaskRepository).inSingletonScope()

// Bind services
container.bind<TaskService>(TYPES.TaskService).to(TaskService).inSingletonScope()

// Bind use cases
container.bind<CreateTaskCommand>(TYPES.CreateTaskCommand).to(CreateTaskCommand)
```

### 8. **Configuration Management**

```typescript
// config/index.ts
export interface AppConfig {
  rendering: RenderingConfig
  timeline: TimelineConfig
  persistence: PersistenceConfig
  features: FeatureFlags
  runtime: RuntimeConfig // Bun-specific configurations
}

// config/environments/
├── development.ts
├── production.ts
└── test.ts
```

### 9. **Bun 2 Runtime Configuration**

```typescript
// bunfig.toml - Bun configuration file
[install]
# Use the latest React 19.1
peer = true
exact = false

[install.cache]
dir = "~/.bun/cache"
disable = false

[test]
# Bun's built-in test runner configuration
preload = ["./test-setup.ts"]
coverage = true
coverageThreshold = 80

[run]
# Bun runtime optimizations
bun = true
smol = true # Use less memory

// package.json scripts with Bun
{
  "scripts": {
    "dev": "bun run --hot src/main.tsx",
    "build": "bun build src/main.tsx --outdir=dist --minify --splitting",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "bench": "bun run benchmarks/*.bench.ts",
    "typecheck": "bun run tsc --noEmit"
  }
}

// Using Bun's built-in APIs
// infrastructure/runtime/bun-optimizations.ts
import { spawn } from "bun"
import { Database } from "bun:sqlite"

export class BunOptimizedServices {
  // Use Bun's native SQLite for local caching
  private cache = new Database(":memory:")

  // Leverage Bun's fast subprocess spawning
  async runHeavyComputation(data: any) {
    const subprocess = spawn({
      cmd: ["bun", "run", "./workers/compute.ts"],
      stdin: JSON.stringify(data),
    })

    return await subprocess.text()
  }

  // Use Bun's native HTTP server for development
  startDevServer() {
    Bun.serve({
      port: 3000,
      async fetch(request) {
        // Handle requests with Bun's fast I/O
        return new Response("Hello from Bun!")
      },
    })
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation

1. Set up new folder structure
2. Create domain entities and value objects
3. Define repository interfaces
4. Implement dependency injection container

### Phase 2: Domain Layer

1. Implement domain services
2. Create application commands and queries
3. Set up event bus
4. Write domain tests

### Phase 3: State Management

1. Refactor Redux structure
2. Implement feature slices
3. Create selectors and thunks
4. Migrate existing state logic

### Phase 4: Renderer Refactoring

1. Implement ECS pattern
2. Create render pipeline
3. Refactor scene management
4. Optimize performance

### Phase 5: UI Components

1. Implement container/presenter pattern
2. Create custom hooks
3. Refactor existing components
4. Update styling structure

### Phase 6: Testing & Documentation

1. Write comprehensive tests
2. Create architecture documentation
3. Update developer guides
4. Performance benchmarking

## Benefits of Refactoring

1. **Improved Testability**: 80%+ code coverage achievable with Bun's fast test runner
2. **Better Maintainability**: Clear separation of concerns with proper DDD boundaries
3. **Enhanced Scalability**: Easy to add new features with modular architecture
4. **Performance**:
   - Optimized rendering pipeline
   - Bun's fast runtime (4x faster than Node.js)
   - React 19.1's automatic batching and concurrent features
5. **Developer Experience**:
   - Clear code organization
   - Faster build times with Bun (up to 10x faster)
   - Hot module replacement with Bun's --hot flag
6. **Type Safety**: Stronger typing throughout with TypeScript 5.3+
7. **Reusability**: Shared domain logic across different UI implementations
8. **Modern Features**:
   - React 19.1's Server Components support (future-ready)
   - Suspense for data fetching
   - Optimistic updates with useOptimistic
   - Built-in form handling with useFormStatus

## Risk Mitigation

1. **Incremental Migration**: Refactor module by module
2. **Feature Flags**: Toggle between old and new implementations
3. **Comprehensive Testing**: Test at each migration step
4. **Documentation**: Keep docs updated throughout
5. **Version Control**: Create feature branches for each phase

## Metrics for Success

- **Code Coverage**: Increase from ~0% to 80%+ (measured with Bun test coverage)
- **Bundle Size**: Reduce by 30-40% with Bun's optimized bundler
- **Render Performance**: 60 FPS consistent with React 19.1 concurrent rendering
- **Build Time**: Reduce by 70-80% using Bun instead of Node.js/Webpack
- **Test Execution**: 5-10x faster with Bun's native test runner
- **Type Coverage**: 100% typed code with strict TypeScript
- **Cyclomatic Complexity**: Reduce by 50% through better separation
- **Start-up Time**: 200ms or less with Bun's fast cold starts
- **Memory Usage**: 30% less RAM usage with Bun's efficient runtime
- **Developer Feedback Loop**: < 100ms hot reload with Bun --hot

## Conclusion

This refactoring plan addresses the current architectural issues while providing a clear path forward. By leveraging modern technologies like Bun 2 and React 19.1, along with industry-standard architectural patterns (DDD, Clean Architecture, CQRS), the proposed changes will result in:

- A **significantly faster** development and runtime experience with Bun's performance improvements
- A **more maintainable** codebase with clear separation between business logic and technical concerns
- **Enhanced user experience** through React 19.1's concurrent features and optimistic updates
- A **scalable architecture** that can easily accommodate new features and requirements

The combination of proper domain modeling, modern tooling, and clean architecture principles ensures the Cadence project will be well-positioned for future growth and maintainability.
