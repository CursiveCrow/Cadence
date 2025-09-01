/**
 * Task Domain Entity
 * Represents a task in the project timeline with business logic and behavior
 */

import { TaskStatus } from '../value-objects/TaskStatus'
import { TimeRange } from '../value-objects/TimeRange'

export interface TaskProperties {
    id: string
    title: string
    startDate: string
    durationDays: number
    status: TaskStatus
    assignee?: string
    description?: string
    staffId: string
    staffLine: number
    laneIndex?: number
    projectId: string
    createdAt: string
    updatedAt: string
}

export class Task {
    private constructor(private props: TaskProperties) { }

    static create(props: Omit<TaskProperties, 'createdAt' | 'updatedAt'>): Task {
        const now = new Date().toISOString()
        return new Task({
            ...props,
            createdAt: now,
            updatedAt: now
        })
    }

    static fromPersistence(props: TaskProperties): Task {
        return new Task(props)
    }

    // Getters
    get id(): string { return this.props.id }
    get title(): string { return this.props.title }
    get startDate(): string { return this.props.startDate }
    get durationDays(): number { return this.props.durationDays }
    get status(): TaskStatus { return this.props.status }
    get assignee(): string | undefined { return this.props.assignee }
    get description(): string | undefined { return this.props.description }
    get staffId(): string { return this.props.staffId }
    get staffLine(): number { return this.props.staffLine }
    get laneIndex(): number | undefined { return this.props.laneIndex }
    get projectId(): string { return this.props.projectId }
    get createdAt(): string { return this.props.createdAt }
    get updatedAt(): string { return this.props.updatedAt }

    // Business logic methods
    get endDate(): string {
        const start = new Date(this.props.startDate)
        const end = new Date(start)
        end.setDate(end.getDate() + this.props.durationDays)
        return end.toISOString().split('T')[0]
    }

    get timeRange(): TimeRange {
        return TimeRange.create(this.props.startDate, this.endDate)
    }

    canTransitionTo(newStatus: TaskStatus): boolean {
        // Business rules for status transitions
        if (this.props.status === TaskStatus.CANCELLED) {
            return false // Cannot transition from cancelled
        }

        if (this.props.status === TaskStatus.COMPLETED) {
            return newStatus === TaskStatus.IN_PROGRESS // Can only reopen
        }

        return true // All other transitions allowed
    }

    updateStatus(newStatus: TaskStatus): Task {
        if (!this.canTransitionTo(newStatus)) {
            throw new Error(`Cannot transition from ${this.props.status} to ${newStatus}`)
        }

        return new Task({
            ...this.props,
            status: newStatus,
            updatedAt: new Date().toISOString()
        })
    }

    updateDetails(updates: Partial<Omit<TaskProperties, 'id' | 'projectId' | 'createdAt'>>): Task {
        return new Task({
            ...this.props,
            ...updates,
            updatedAt: new Date().toISOString()
        })
    }

    moveTo(staffId: string, staffLine: number): Task {
        return new Task({
            ...this.props,
            staffId,
            staffLine,
            updatedAt: new Date().toISOString()
        })
    }

    reschedule(startDate: string, durationDays?: number): Task {
        return new Task({
            ...this.props,
            startDate,
            durationDays: durationDays ?? this.props.durationDays,
            updatedAt: new Date().toISOString()
        })
    }

    assignTo(assignee: string | undefined): Task {
        return new Task({
            ...this.props,
            assignee,
            updatedAt: new Date().toISOString()
        })
    }

    setLaneIndex(laneIndex: number): Task {
        return new Task({
            ...this.props,
            laneIndex,
            updatedAt: new Date().toISOString()
        })
    }

    isBlocked(): boolean {
        return this.props.status === TaskStatus.BLOCKED
    }

    isCompleted(): boolean {
        return this.props.status === TaskStatus.COMPLETED
    }

    isActive(): boolean {
        return this.props.status === TaskStatus.IN_PROGRESS
    }

    isPending(): boolean {
        return this.props.status === TaskStatus.NOT_STARTED
    }

    isCancelled(): boolean {
        return this.props.status === TaskStatus.CANCELLED
    }

    overlapsWithRange(range: TimeRange): boolean {
        return this.timeRange.overlaps(range)
    }

    toJSON(): TaskProperties {
        return { ...this.props }
    }
}
