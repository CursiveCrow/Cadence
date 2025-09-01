/**
 * DependencyType Value Object
 * Represents the type of dependency between tasks
 */

export enum DependencyType {
    FINISH_TO_START = 'finish_to_start',
    START_TO_START = 'start_to_start',
    FINISH_TO_FINISH = 'finish_to_finish',
    START_TO_FINISH = 'start_to_finish',
}

export class DependencyTypeValue {
    private constructor(private readonly value: DependencyType) { }

    static fromString(type: string): DependencyTypeValue {
        if (!Object.values(DependencyType).includes(type as DependencyType)) {
            throw new Error(`Invalid dependency type: ${type}`)
        }
        return new DependencyTypeValue(type as DependencyType)
    }

    static create(type: DependencyType): DependencyTypeValue {
        return new DependencyTypeValue(type)
    }

    getValue(): DependencyType {
        return this.value
    }

    toString(): string {
        return this.value
    }

    equals(other: DependencyTypeValue): boolean {
        return this.value === other.value
    }

    isFinishToStart(): boolean {
        return this.value === DependencyType.FINISH_TO_START
    }

    isStartToStart(): boolean {
        return this.value === DependencyType.START_TO_START
    }

    isFinishToFinish(): boolean {
        return this.value === DependencyType.FINISH_TO_FINISH
    }

    isStartToFinish(): boolean {
        return this.value === DependencyType.START_TO_FINISH
    }

    getDescription(): string {
        switch (this.value) {
            case DependencyType.FINISH_TO_START:
                return 'Task must finish before dependent task can start'
            case DependencyType.START_TO_START:
                return 'Tasks must start at the same time'
            case DependencyType.FINISH_TO_FINISH:
                return 'Tasks must finish at the same time'
            case DependencyType.START_TO_FINISH:
                return 'Task must start before dependent task can finish'
            default:
                return 'Unknown dependency type'
        }
    }
}

// Re-export for convenience
export { DependencyType as DependencyTypeEnum }
