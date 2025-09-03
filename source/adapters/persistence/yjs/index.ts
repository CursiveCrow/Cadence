import type { PersistencePort, ProjectSnapshot } from '../../../application/ports/PersistencePort'
import type { TaskData, DependencyData } from '../../../application/ports/PersistencePort'
import { getProjectDoc } from './ydoc'
import { createTask as yCreateTask, updateTask as yUpdateTask, deleteTask as yDeleteTask, createDependency as yCreateDependency, deleteDependency as yDeleteDependency } from './mutations'

export class YjsPersistenceAdapter implements PersistencePort {
  async createTask(projectId: string, task: Omit<TaskData, 'projectId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    yCreateTask(projectId, task as any)
  }
  async updateTask(projectId: string, taskId: string, updates: Partial<TaskData>): Promise<void> {
    yUpdateTask(projectId, taskId, updates)
  }
  async deleteTask(projectId: string, taskId: string): Promise<void> {
    yDeleteTask(projectId, taskId)
  }
  async createDependency(projectId: string, dep: Omit<DependencyData, 'projectId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    yCreateDependency(projectId, dep as any)
  }
  async deleteDependency(projectId: string, dependencyId: string): Promise<void> {
    yDeleteDependency(projectId, dependencyId)
  }
  subscribeTasks(projectId: string, onChange: (tasks: Record<string, TaskData>) => void): () => void {
    const doc = getProjectDoc(projectId)
    const map = doc.tasks
    const observer = () => onChange(map.toJSON() as Record<string, TaskData>)
    map.observe(observer)
    observer()
    return () => map.unobserve(observer)
  }
  subscribeDependencies(projectId: string, onChange: (deps: Record<string, DependencyData>) => void): () => void {
    const doc = getProjectDoc(projectId)
    const map = doc.dependencies
    const observer = () => onChange(map.toJSON() as Record<string, DependencyData>)
    map.observe(observer)
    observer()
    return () => map.unobserve(observer)
  }

  async getSnapshot(projectId: string): Promise<ProjectSnapshot> {
    const doc = getProjectDoc(projectId)
    return { tasks: doc.getTasks(), dependencies: doc.getDependencies() }
  }

  subscribeProject(projectId: string, onChange: (snapshot: ProjectSnapshot) => void): () => void {
    const doc = getProjectDoc(projectId)
    const obs = () => onChange({ tasks: doc.getTasks(), dependencies: doc.getDependencies() })
    doc.tasks.observe(obs)
    doc.dependencies.observe(obs)
    obs()
    return () => { doc.tasks.unobserve(obs); doc.dependencies.unobserve(obs) }
  }
}

export function createPersistence(): PersistencePort { return new YjsPersistenceAdapter() }
