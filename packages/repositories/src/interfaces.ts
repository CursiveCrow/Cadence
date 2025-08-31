import type { Task, Dependency, Staff, Project } from '@cadence/core'

export interface WatchEvent<T> { type: 'upsert' | 'remove'; data: T[] }

export interface RepositoryBase<T> {
    watch(cb: (e: WatchEvent<T>) => void): () => void
    bulkUpsert(items: T[]): Promise<void>
    create(item: T): Promise<void>
    update(id: string, updates: Partial<T>): Promise<void>
    delete(id: string): Promise<void>
    initialize(): Promise<void>
    dispose(): Promise<void>
    /** Optional for multi-project backends (e.g., Yjs doc per project) */
    attachProject?(projectId: string): () => void
}

export type TasksRepository = RepositoryBase<Task>
export type DependenciesRepository = RepositoryBase<Dependency>
export type StaffsRepository = RepositoryBase<Staff>
export type ProjectsRepository = RepositoryBase<Project>

