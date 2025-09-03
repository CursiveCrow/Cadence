import type { Task, Dependency } from '@cadence/core'

export type TaskData = Omit<Task, 'laneIndex'>
export type DependencyData = Dependency

export interface ProjectSnapshot {
  tasks: Record<string, TaskData>
  dependencies: Record<string, DependencyData>
}

export interface PersistencePort {
  createTask(projectId: string, task: Omit<TaskData, 'projectId' | 'createdAt' | 'updatedAt'>): Promise<void>
  updateTask(projectId: string, taskId: string, updates: Partial<TaskData>): Promise<void>
  deleteTask(projectId: string, taskId: string): Promise<void>

  createDependency(projectId: string, dep: Omit<DependencyData, 'projectId' | 'createdAt' | 'updatedAt'>): Promise<void>
  deleteDependency(projectId: string, dependencyId: string): Promise<void>

  // Legacy granular subscriptions (kept for incremental migration)
  subscribeTasks(projectId: string, onChange: (tasks: Record<string, TaskData>) => void): () => void
  subscribeDependencies(projectId: string, onChange: (deps: Record<string, DependencyData>) => void): () => void

  // Cohesive snapshot APIs
  getSnapshot(projectId: string): Promise<ProjectSnapshot>
  subscribeProject(projectId: string, onChange: (snapshot: ProjectSnapshot) => void): () => void
}
