/**
 * TaskStatus Value Object
 * Immutable representation of task status
 */

export enum TaskStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    BLOCKED = 'blocked',
    CANCELLED = 'cancelled',
}

export class TaskStatusValue {
    private constructor(private readonly value: TaskStatus) { }

    static fromString(status: string): TaskStatusValue {
        if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
            throw new Error(`Invalid task status: ${status}`)
        }
        return new TaskStatusValue(status as TaskStatus)
    }

    static create(status: TaskStatus): TaskStatusValue {
        return new TaskStatusValue(status)
    }

    getValue(): TaskStatus {
        return this.value
    }

    toString(): string {
        return this.value
    }

    equals(other: TaskStatusValue): boolean {
        return this.value === other.value
    }

    isNotStarted(): boolean {
        return this.value === TaskStatus.NOT_STARTED
    }

    isInProgress(): boolean {
        return this.value === TaskStatus.IN_PROGRESS
    }

    isCompleted(): boolean {
        return this.value === TaskStatus.COMPLETED
    }

    isBlocked(): boolean {
        return this.value === TaskStatus.BLOCKED
    }

    isCancelled(): boolean {
        return this.value === TaskStatus.CANCELLED
    }

    canTransitionTo(newStatus: TaskStatus): boolean {
        // Business rules for status transitions
        if (this.value === TaskStatus.CANCELLED) {
            return false // Cannot transition from cancelled
        }

        if (this.value === TaskStatus.COMPLETED) {
            return newStatus === TaskStatus.IN_PROGRESS // Can only reopen
        }

        return true // All other transitions allowed
    }
}

// Re-export for convenience
export { TaskStatus as TaskStatusEnum }
