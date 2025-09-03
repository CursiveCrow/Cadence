import type { PersistencePort } from '../ports/PersistencePort'
import type { Task } from '@cadence/core'

export type CreateTaskInput = Omit<Task, 'projectId' | 'createdAt' | 'updatedAt'> & { projectId: string }

export const createTask = (persistence: PersistencePort) => async (input: CreateTaskInput) => {
  const { projectId, ...task } = input
  await persistence.createTask(projectId, task)
}
