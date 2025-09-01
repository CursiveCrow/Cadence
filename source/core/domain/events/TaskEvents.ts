/**
 * Domain Events for Task-related operations
 * These events are emitted when significant domain actions occur
 */

import { Task } from '../entities/Task'
import { Dependency } from '../entities/Dependency'
import { TaskStatus } from '../value-objects/TaskStatus'

export interface DomainEvent {
    id: string
    type: string
    timestamp: Date
    aggregateId: string
    payload: any
}

export class TaskCreatedEvent implements DomainEvent {
    readonly id: string
    readonly type = 'TaskCreated'
    readonly timestamp: Date
    readonly aggregateId: string

    constructor(public readonly payload: { task: Task }) {
        this.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.timestamp = new Date()
        this.aggregateId = payload.task.id
    }
}

export class TaskUpdatedEvent implements DomainEvent {
    readonly id: string
    readonly type = 'TaskUpdated'
    readonly timestamp: Date
    readonly aggregateId: string

    constructor(public readonly payload: {
        task: Task
        previousTask: Task
        changes: Partial<Task>
    }) {
        this.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.timestamp = new Date()
        this.aggregateId = payload.task.id
    }
}

export class TaskDeletedEvent implements DomainEvent {
    readonly id: string
    readonly type = 'TaskDeleted'
    readonly timestamp: Date
    readonly aggregateId: string

    constructor(public readonly payload: { taskId: string; task: Task }) {
        this.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.timestamp = new Date()
        this.aggregateId = payload.taskId
    }
}

export class TaskStatusChangedEvent implements DomainEvent {
    readonly id: string
    readonly type = 'TaskStatusChanged'
    readonly timestamp: Date
    readonly aggregateId: string

    constructor(public readonly payload: {
        taskId: string
        previousStatus: TaskStatus
        newStatus: TaskStatus
        task: Task
    }) {
        this.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.timestamp = new Date()
        this.aggregateId = payload.taskId
    }
}

export class TaskMovedEvent implements DomainEvent {
    readonly id: string
    readonly type = 'TaskMoved'
    readonly timestamp: Date
    readonly aggregateId: string

    constructor(public readonly payload: {
        taskId: string
        previousStaffId: string
        previousStaffLine: number
        newStaffId: string
        newStaffLine: number
        task: Task
    }) {
        this.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.timestamp = new Date()
        this.aggregateId = payload.taskId
    }
}

export class TaskRescheduledEvent implements DomainEvent {
    readonly id: string
    readonly type = 'TaskRescheduled'
    readonly timestamp: Date
    readonly aggregateId: string

    constructor(public readonly payload: {
        taskId: string
        previousStartDate: string
        previousDuration: number
        newStartDate: string
        newDuration: number
        task: Task
    }) {
        this.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.timestamp = new Date()
        this.aggregateId = payload.taskId
    }
}

export class DependencyCreatedEvent implements DomainEvent {
    readonly id: string
    readonly type = 'DependencyCreated'
    readonly timestamp: Date
    readonly aggregateId: string

    constructor(public readonly payload: { dependency: Dependency }) {
        this.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.timestamp = new Date()
        this.aggregateId = payload.dependency.id
    }
}

export class DependencyDeletedEvent implements DomainEvent {
    readonly id: string
    readonly type = 'DependencyDeleted'
    readonly timestamp: Date
    readonly aggregateId: string

    constructor(public readonly payload: {
        dependencyId: string
        dependency: Dependency
    }) {
        this.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.timestamp = new Date()
        this.aggregateId = payload.dependencyId
    }
}

export class ProjectScheduleOptimizedEvent implements DomainEvent {
    readonly id: string
    readonly type = 'ProjectScheduleOptimized'
    readonly timestamp: Date
    readonly aggregateId: string

    constructor(public readonly payload: {
        projectId: string
        tasksAffected: number
        optimizationType: 'lanes' | 'resources' | 'critical-path'
    }) {
        this.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.timestamp = new Date()
        this.aggregateId = payload.projectId
    }
}

/**
 * Event Bus interface for publishing and subscribing to domain events
 */
export interface EventBus {
    publish(event: DomainEvent): Promise<void>
    subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void
    unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void
}

/**
 * Simple in-memory event bus implementation
 */
export class InMemoryEventBus implements EventBus {
    private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>()

    async publish(event: DomainEvent): Promise<void> {
        const eventHandlers = this.handlers.get(event.type) || []

        for (const handler of eventHandlers) {
            try {
                await handler(event)
            } catch (error) {
                console.error(`Error handling event ${event.type}:`, error)
            }
        }
    }

    subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, [])
        }
        this.handlers.get(eventType)!.push(handler)
    }

    unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
        const handlers = this.handlers.get(eventType)
        if (handlers) {
            const index = handlers.indexOf(handler)
            if (index > -1) {
                handlers.splice(index, 1)
            }
        }
    }
}
