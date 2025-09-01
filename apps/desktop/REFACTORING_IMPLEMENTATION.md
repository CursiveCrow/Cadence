# Cadence Refactoring Implementation Guide

## Priority 1: Critical Issues to Address First

### Issue 1: Monolithic Renderer Engine

**Current Problem:**
The `TimelineRendererEngine` class in `src/renderer/core/engine.ts` has 263 lines and handles:

- PIXI.js application lifecycle
- Scene management
- Event handling
- Viewport management
- Rendering orchestration
- Plugin management

**Refactored Solution:**

```typescript
// src/renderer/core/RenderingContext.ts
export interface RenderingContext {
  app: Application
  viewport: ViewportManager
  scene: SceneManager
  eventBus: EventEmitter
}

// src/renderer/core/RenderingPipeline.ts
export class RenderingPipeline {
  private stages: RenderStage[] = []

  addStage(stage: RenderStage): void {
    this.stages.push(stage)
  }

  async render(context: RenderingContext, data: RenderData): Promise<void> {
    for (const stage of this.stages) {
      await stage.execute(context, data)
    }
  }
}

// src/renderer/stages/GridRenderStage.ts
export class GridRenderStage implements RenderStage {
  async execute(context: RenderingContext, data: RenderData): Promise<void> {
    const { viewport, scene } = context
    // Grid-specific rendering logic
  }
}

// src/renderer/TimelineRenderer.ts (simplified main class)
export class TimelineRenderer {
  private pipeline: RenderingPipeline
  private context: RenderingContext

  constructor(canvas: HTMLCanvasElement, config: TimelineConfig) {
    this.context = this.createContext(canvas, config)
    this.pipeline = this.createPipeline()
  }

  private createPipeline(): RenderingPipeline {
    const pipeline = new RenderingPipeline()
    pipeline.addStage(new GridRenderStage())
    pipeline.addStage(new TaskRenderStage())
    pipeline.addStage(new DependencyRenderStage())
    pipeline.addStage(new SelectionRenderStage())
    return pipeline
  }

  render(data: RenderData): void {
    this.pipeline.render(this.context, data)
  }
}
```

### Issue 2: Mixed State Management

**Current Problem:**
Redux state mixes UI and domain concerns in `src/surface/state/`:

- UI state (selection, viewport) persisted unnecessarily
- Domain state (tasks, dependencies) mixed with UI
- No clear command/query separation

**Refactored Solution:**

```typescript
// src/domain/store/domainStore.ts
export const domainStore = configureStore({
  reducer: {
    projects: projectsReducer,
    tasks: tasksReducer,
    dependencies: dependenciesReducer,
    staffs: staffsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(persistenceMiddleware, eventMiddleware),
})

// src/presentation/store/uiStore.ts
export const uiStore = configureStore({
  reducer: {
    selection: selectionReducer,
    viewport: viewportReducer,
    modals: modalsReducer,
    dragDrop: dragDropReducer,
  },
  // UI state is not persisted
})

// src/application/facades/StoreFacade.ts
export class StoreFacade {
  constructor(
    private domainStore: Store,
    private uiStore: Store
  ) {}

  // Commands (write operations)
  async executeCommand<T>(command: Command<T>): Promise<T> {
    const result = await command.execute()
    this.domainStore.dispatch(command.toAction())
    return result
  }

  // Queries (read operations)
  async executeQuery<T>(query: Query<T>): Promise<T> {
    return query.execute(this.domainStore.getState())
  }

  // UI operations
  updateUIState(action: AnyAction): void {
    this.uiStore.dispatch(action)
  }
}
```

### Issue 3: Component Responsibilities

**Current Problem:**
`CadenceMain.tsx` has 152 lines mixing:

- Redux state management
- Event handling
- Business logic
- UI composition
- Viewport calculations

**Refactored Solution:**

```typescript
// src/presentation/containers/CadenceContainer.tsx
export const CadenceContainer: React.FC = () => {
  const { execute } = useCommandBus()
  const tasks = useQuery(GetTasksQuery)
  const viewport = useUIState(state => state.viewport)

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    execute(new UpdateTaskCommand(taskId, updates))
  }, [execute])

  return (
    <CadencePresenter
      tasks={tasks}
      viewport={viewport}
      onTaskUpdate={handleTaskUpdate}
    />
  )
}

// src/presentation/components/CadencePresenter.tsx
interface CadencePresenterProps {
  tasks: Task[]
  viewport: Viewport
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
}

export const CadencePresenter: React.FC<CadencePresenterProps> = ({
  tasks,
  viewport,
  onTaskUpdate
}) => {
  // Pure presentation logic only
  return (
    <div className="cadence-main">
      <Header />
      <div className="cadence-content">
        <Sidebar />
        <TimelineView
          tasks={tasks}
          viewport={viewport}
          onTaskUpdate={onTaskUpdate}
        />
      </div>
    </div>
  )
}

// src/presentation/hooks/useCommandBus.ts
export function useCommandBus() {
  const commandBus = useContext(CommandBusContext)

  return {
    execute: useCallback(async <T>(command: Command<T>): Promise<T> => {
      return await commandBus.execute(command)
    }, [commandBus])
  }
}
```

## Priority 2: Domain Model Implementation

### Current Domain Model Issues

**Problem:** Anemic domain model with no behavior, just data structures.

**Solution:** Rich domain entities with business logic:

```typescript
// src/domain/entities/Task.ts
export class Task {
  private constructor(
    private readonly id: TaskId,
    private title: string,
    private timeRange: TimeRange,
    private status: TaskStatus,
    private staffAssignment: StaffAssignment,
    private dependencies: Set<TaskId> = new Set()
  ) {}

  static create(params: CreateTaskParams): Result<Task> {
    // Validation
    if (!params.title || params.title.length < 3) {
      return Result.fail('Task title must be at least 3 characters')
    }

    const timeRange = TimeRange.create(params.startDate, params.duration)
    if (timeRange.isFailure) {
      return Result.fail(timeRange.error)
    }

    return Result.ok(
      new Task(
        TaskId.create(),
        params.title,
        timeRange.value,
        TaskStatus.NotStarted,
        StaffAssignment.create(params.staffId, params.staffLine)
      )
    )
  }

  // Business logic methods
  canStart(): boolean {
    return this.status === TaskStatus.NotStarted && this.timeRange.hasStarted()
  }

  markAsInProgress(): Result<void> {
    if (!this.canStart()) {
      return Result.fail('Cannot start task')
    }
    this.status = TaskStatus.InProgress
    return Result.ok()
  }

  reschedule(newTimeRange: TimeRange): Result<void> {
    // Check business rules
    if (this.status === TaskStatus.Completed) {
      return Result.fail('Cannot reschedule completed task')
    }

    if (this.hasConflictWith(newTimeRange)) {
      return Result.fail('Schedule conflict detected')
    }

    this.timeRange = newTimeRange
    return Result.ok()
  }

  addDependency(taskId: TaskId): Result<void> {
    if (this.wouldCreateCycle(taskId)) {
      return Result.fail('Would create dependency cycle')
    }
    this.dependencies.add(taskId)
    return Result.ok()
  }

  // Value object getters
  get id(): string {
    return this.id.value
  }
  get title(): string {
    return this.title
  }
  get startDate(): Date {
    return this.timeRange.startDate
  }
  get endDate(): Date {
    return this.timeRange.endDate
  }
  get duration(): number {
    return this.timeRange.durationInDays
  }
}

// src/domain/value-objects/TimeRange.ts
export class TimeRange {
  private constructor(
    readonly startDate: Date,
    readonly endDate: Date
  ) {}

  static create(startDate: Date, durationDays: number): Result<TimeRange> {
    if (durationDays <= 0) {
      return Result.fail('Duration must be positive')
    }

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + durationDays)

    return Result.ok(new TimeRange(startDate, endDate))
  }

  get durationInDays(): number {
    return Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  hasStarted(): boolean {
    return new Date() >= this.startDate
  }

  overlaps(other: TimeRange): boolean {
    return this.startDate < other.endDate && this.endDate > other.startDate
  }
}
```

## Priority 3: Event-Driven Architecture

### Implement Domain Events

```typescript
// src/domain/events/DomainEvent.ts
export abstract class DomainEvent {
  readonly occurredAt: Date = new Date()
  abstract readonly eventType: string
  abstract readonly aggregateId: string
}

// src/domain/events/TaskEvents.ts
export class TaskCreatedEvent extends DomainEvent {
  readonly eventType = 'TaskCreated'

  constructor(
    readonly aggregateId: string,
    readonly task: Task
  ) {
    super()
  }
}

export class TaskRescheduledEvent extends DomainEvent {
  readonly eventType = 'TaskRescheduled'

  constructor(
    readonly aggregateId: string,
    readonly oldTimeRange: TimeRange,
    readonly newTimeRange: TimeRange
  ) {
    super()
  }
}

// src/infrastructure/events/EventBus.ts
export class EventBus {
  private handlers = new Map<string, EventHandler[]>()

  subscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || []
    handlers.push(handler)
    this.handlers.set(eventType, handlers)
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || []

    await Promise.all(handlers.map(handler => handler.handle(event)))
  }
}

// src/application/event-handlers/TaskEventHandlers.ts
export class NotifyOnTaskCreated implements EventHandler {
  async handle(event: TaskCreatedEvent): Promise<void> {
    // Send notification
    await this.notificationService.notify({
      type: 'task_created',
      data: event.task,
    })
  }
}

export class UpdateTimelineOnReschedule implements EventHandler {
  async handle(event: TaskRescheduledEvent): Promise<void> {
    // Update timeline view
    await this.timelineService.refresh(event.aggregateId)
  }
}
```

## Priority 4: Testing Infrastructure

### Unit Testing Setup

```typescript
// src/domain/entities/__tests__/Task.test.ts
describe('Task Entity', () => {
  describe('create', () => {
    it('should create a valid task', () => {
      const result = Task.create({
        title: 'Test Task',
        startDate: new Date('2024-01-01'),
        duration: 5,
        staffId: 'staff-1',
        staffLine: 1,
      })

      expect(result.isSuccess).toBe(true)
      expect(result.value.title).toBe('Test Task')
      expect(result.value.duration).toBe(5)
    })

    it('should fail with invalid title', () => {
      const result = Task.create({
        title: 'AB', // Too short
        startDate: new Date('2024-01-01'),
        duration: 5,
        staffId: 'staff-1',
        staffLine: 1,
      })

      expect(result.isFailure).toBe(true)
      expect(result.error).toContain('at least 3 characters')
    })
  })

  describe('reschedule', () => {
    it('should reschedule task successfully', () => {
      const task = createTestTask()
      const newTimeRange = TimeRange.create(new Date('2024-02-01'), 3).value

      const result = task.reschedule(newTimeRange)

      expect(result.isSuccess).toBe(true)
      expect(task.startDate).toEqual(new Date('2024-02-01'))
    })

    it('should not reschedule completed task', () => {
      const task = createCompletedTask()
      const newTimeRange = TimeRange.create(new Date('2024-02-01'), 3).value

      const result = task.reschedule(newTimeRange)

      expect(result.isFailure).toBe(true)
      expect(result.error).toContain('Cannot reschedule completed')
    })
  })
})

// src/application/commands/__tests__/CreateTaskCommand.test.ts
describe('CreateTaskCommand', () => {
  let command: CreateTaskCommand
  let mockRepo: jest.Mocked<TaskRepository>
  let mockEventBus: jest.Mocked<EventBus>

  beforeEach(() => {
    mockRepo = createMockTaskRepository()
    mockEventBus = createMockEventBus()
    command = new CreateTaskCommand(mockRepo, mockEventBus)
  })

  it('should create task and publish event', async () => {
    const dto = {
      title: 'New Task',
      startDate: '2024-01-01',
      duration: 5,
      staffId: 'staff-1',
      staffLine: 1,
    }

    const result = await command.execute(dto)

    expect(result.isSuccess).toBe(true)
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Task',
      })
    )
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TaskCreated',
      })
    )
  })
})
```

## Priority 5: Performance Optimizations

### Rendering Performance

```typescript
// src/renderer/optimization/RenderOptimizer.ts
export class RenderOptimizer {
  private renderQueue: RenderTask[] = []
  private rafId: number | null = null
  private lastFrameTime = 0

  // Batch render operations
  queueRender(task: RenderTask): void {
    this.renderQueue.push(task)
    this.scheduleRender()
  }

  private scheduleRender(): void {
    if (this.rafId) return

    this.rafId = requestAnimationFrame(time => {
      this.processRenderQueue(time)
    })
  }

  private processRenderQueue(time: number): void {
    const deltaTime = time - this.lastFrameTime
    const targetFrameTime = 1000 / 60 // 60 FPS

    // Process tasks within frame budget
    const startTime = performance.now()

    while (this.renderQueue.length > 0) {
      const elapsed = performance.now() - startTime

      if (elapsed > targetFrameTime * 0.8) {
        // Leave 20% frame budget for browser
        break
      }

      const task = this.renderQueue.shift()!
      task.execute()
    }

    this.lastFrameTime = time
    this.rafId = null

    if (this.renderQueue.length > 0) {
      this.scheduleRender()
    }
  }
}

// src/renderer/culling/FrustumCuller.ts
export class FrustumCuller {
  private viewport: Rectangle

  isVisible(bounds: Rectangle): boolean {
    return this.viewport.intersects(bounds)
  }

  cullTasks(tasks: Task[], viewport: Rectangle): Task[] {
    this.viewport = viewport

    return tasks.filter(task => {
      const bounds = this.getTaskBounds(task)
      return this.isVisible(bounds)
    })
  }

  private getTaskBounds(task: Task): Rectangle {
    // Calculate task screen bounds
    const x = task.startDate * DAY_WIDTH
    const y = task.staffLine * LINE_HEIGHT
    const width = task.duration * DAY_WIDTH
    const height = TASK_HEIGHT

    return new Rectangle(x, y, width, height)
  }
}
```

## Migration Strategy

### Phase 1: Parallel Development (Week 1)

1. Create new folder structure alongside existing
2. Set up build configurations for new structure
3. Implement core domain entities
4. Create basic tests

### Phase 2: Gradual Migration (Week 2-3)

1. Migrate one feature at a time
2. Use feature flags to switch between old/new
3. Maintain backward compatibility
4. Run both systems in parallel

### Phase 3: Integration (Week 4)

1. Replace old modules with new ones
2. Update import paths
3. Remove deprecated code
4. Update documentation

### Phase 4: Cleanup (Week 5)

1. Remove old folder structure
2. Update all dependencies
3. Optimize build configuration
4. Final testing

## Rollback Plan

1. **Git Branching**: All refactoring in feature branches
2. **Feature Flags**: Toggle between implementations
3. **Incremental Commits**: Small, reversible changes
4. **Backup Strategy**: Tag stable versions before major changes
5. **Testing Gates**: No merge without passing tests

## Success Criteria

- [ ] All tests passing (80%+ coverage)
- [ ] No performance regression
- [ ] Reduced bundle size by 20%
- [ ] Clear separation of concerns
- [ ] Improved developer documentation
- [ ] Successful code review
- [ ] Production deployment without issues
