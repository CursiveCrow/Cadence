/**
 * Redux implementation of TaskRepository
 * Handles task persistence using Redux store
 */

import { Store } from '@reduxjs/toolkit'
import { Task } from '../../../../core/domain/entities/Task'
import { TaskRepository as ITaskRepository } from '../../../../core/use-cases/commands/CreateTaskCommand'

export class ReduxTaskRepository implements ITaskRepository {
    constructor(private store: Store) { }

    async findById(id: string): Promise<Task | null> {
        const state = this.store.getState() as any
        const tasks = state.tasks?.byProjectId || {}

        for (const projectTasks of Object.values(tasks)) {
            const projectTasksMap = projectTasks as Record<string, any>
            if (projectTasksMap[id]) {
                return Task.fromPersistence(projectTasksMap[id])
            }
        }

        return null
    }

    async findByProject(projectId: string): Promise<Task[]> {
        const state = this.store.getState() as any
        const projectTasks = state.tasks?.byProjectId?.[projectId] || {}

        return Object.values(projectTasks).map((taskData: any) =>
            Task.fromPersistence(taskData)
        )
    }

    async save(task: Task): Promise<void> {
        const taskData = task.toJSON()

        // Dispatch action to update Redux store
        this.store.dispatch({
            type: 'tasks/upsertTask',
            payload: {
                projectId: task.projectId,
                task: taskData
            }
        })
    }

    async delete(id: string): Promise<void> {
        // Find the task first to get its project ID
        const task = await this.findById(id)
        if (!task) return

        // Dispatch action to delete from Redux store
        this.store.dispatch({
            type: 'tasks/deleteTask',
            payload: {
                projectId: task.projectId,
                taskId: id
            }
        })
    }
}
