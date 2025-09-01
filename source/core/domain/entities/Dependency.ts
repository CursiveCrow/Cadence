/**
 * Dependency Domain Entity
 * Represents a dependency relationship between tasks
 */

import { DependencyType } from '../value-objects/DependencyType'

export interface DependencyProperties {
    id: string
    srcTaskId: string
    dstTaskId: string
    type: DependencyType
    projectId: string
    createdAt: string
    updatedAt: string
}

export class Dependency {
    private constructor(private props: DependencyProperties) { }

    static create(props: Omit<DependencyProperties, 'createdAt' | 'updatedAt'>): Dependency {
        const now = new Date().toISOString()
        return new Dependency({
            ...props,
            createdAt: now,
            updatedAt: now
        })
    }

    static fromPersistence(props: DependencyProperties): Dependency {
        return new Dependency(props)
    }

    // Getters
    get id(): string { return this.props.id }
    get srcTaskId(): string { return this.props.srcTaskId }
    get dstTaskId(): string { return this.props.dstTaskId }
    get type(): DependencyType { return this.props.type }
    get projectId(): string { return this.props.projectId }
    get createdAt(): string { return this.props.createdAt }
    get updatedAt(): string { return this.props.updatedAt }

    // Business logic methods
    isFinishToStart(): boolean {
        return this.props.type === DependencyType.FINISH_TO_START
    }

    isStartToStart(): boolean {
        return this.props.type === DependencyType.START_TO_START
    }

    isFinishToFinish(): boolean {
        return this.props.type === DependencyType.FINISH_TO_FINISH
    }

    isStartToFinish(): boolean {
        return this.props.type === DependencyType.START_TO_FINISH
    }

    involvesTasks(taskIds: string[]): boolean {
        return taskIds.includes(this.props.srcTaskId) || taskIds.includes(this.props.dstTaskId)
    }

    connectsTasks(taskId1: string, taskId2: string): boolean {
        return (this.props.srcTaskId === taskId1 && this.props.dstTaskId === taskId2) ||
            (this.props.srcTaskId === taskId2 && this.props.dstTaskId === taskId1)
    }

    updateType(type: DependencyType): Dependency {
        return new Dependency({
            ...this.props,
            type,
            updatedAt: new Date().toISOString()
        })
    }

    toJSON(): DependencyProperties {
        return { ...this.props }
    }
}
