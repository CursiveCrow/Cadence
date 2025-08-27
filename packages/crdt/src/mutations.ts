/**
 * CRDT Mutation Functions
 * All mutations must occur within a transaction with 'local' origin for UndoManager tracking
 */

import { getProjectDoc, TaskData, DependencyData } from './ydoc'
import { Task, TaskStatus } from '@cadence/core'

/**
 * Create a new task in a project
 */
export function createTask(projectId: string, task: Omit<Task, 'projectId' | 'createdAt' | 'updatedAt'>): void {
  const doc = getProjectDoc(projectId)
  const taskData: TaskData = {
    ...task,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  doc.tasks.set(task.id, taskData)
}

export function updateTask(
  projectId: string,
  taskId: string,
  updates: Partial<TaskData>
): void {
  const ydoc = getProjectDoc(projectId)

  ydoc.ydoc.transact(() => {
    const task = ydoc.tasks.get(taskId)
    if (task) {
      ydoc.tasks.set(taskId, { ...task, ...updates })
    }
  }, 'local')
}

export function deleteTask(projectId: string, taskId: string): void {
  const ydoc = getProjectDoc(projectId)

  ydoc.ydoc.transact(() => {
    ydoc.tasks.delete(taskId)

    // Also remove any dependencies involving this task
    const dependencies = ydoc.getDependencies()
    for (const [depId, dep] of Object.entries(dependencies)) {
      if (dep.srcTaskId === taskId || dep.dstTaskId === taskId) {
        ydoc.dependencies.delete(depId)
      }
    }
  }, 'local')
}

export function moveTask(
  projectId: string,
  taskId: string,
  newStartDate: string
): void {
  const ydoc = getProjectDoc(projectId)

  ydoc.ydoc.transact(() => {
    const task = ydoc.tasks.get(taskId)
    if (task) {
      ydoc.tasks.set(taskId, { ...task, startDate: newStartDate })
    }
  }, 'local')
}

export function createDependency(
  projectId: string,
  dependency: DependencyData
): void {
  const ydoc = getProjectDoc(projectId)

  ydoc.ydoc.transact(() => {
    ydoc.dependencies.set(dependency.id, dependency)
  }, 'local')
}

export function deleteDependency(projectId: string, dependencyId: string): void {
  const ydoc = getProjectDoc(projectId)

  ydoc.ydoc.transact(() => {
    ydoc.dependencies.delete(dependencyId)
  }, 'local')
}

export function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus
): void {
  updateTask(projectId, taskId, { status })
}
