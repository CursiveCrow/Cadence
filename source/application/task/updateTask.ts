import type { PersistencePort } from '../ports/PersistencePort'
import type { TaskData } from '../ports/PersistencePort'

export type UpdateTaskInput = { projectId: string; taskId: string; updates: Partial<TaskData> }

export const updateTask = (persistence: PersistencePort) => async (input: UpdateTaskInput) => {
  await persistence.updateTask(input.projectId, input.taskId, input.updates)
}
