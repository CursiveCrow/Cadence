/**
 * useTaskManagement Hook
 * Custom hook for task management operations with optimistic updates
 */

import { useCallback, useOptimistic, useTransition } from 'react'
import { useAppDispatch } from '../../infrastructure/persistence/redux/store'
import { upsertTask, deleteTask } from '../../infrastructure/persistence/redux/slices/tasksSlice'
import { useRepositories } from './useRepositories'
import { useServices } from './useServices'
import { CreateTaskCommand } from '../../core/use-cases/commands/CreateTaskCommand'
import { UpdateTaskCommand } from '../../core/use-cases/commands/UpdateTaskCommand'
import type { CreateTaskDTO, UpdateTaskDTO, TaskDTO } from '../../core/use-cases/dto/TaskDTO'

export interface UseTaskManagementResult {
    createTask: (dto: CreateTaskDTO) => Promise<TaskDTO>
    updateTask: (taskId: string, updates: UpdateTaskDTO) => Promise<TaskDTO>
    deleteTask: (taskId: string) => Promise<void>
    moveTask: (taskId: string, newStaffId: string, newStaffLine: number) => Promise<TaskDTO>
    rescheduleTask: (taskId: string, newStartDate: string, newDuration?: number) => Promise<TaskDTO>
    changeTaskStatus: (taskId: string, newStatus: string) => Promise<TaskDTO>
    isPending: boolean
}

export function useTaskManagement(tasks: TaskDTO[]): UseTaskManagementResult {
    const dispatch = useAppDispatch()
    const repositories = useRepositories()
    const services = useServices()
    const [isPending, startTransition] = useTransition()

    // React 19's useOptimistic for instant UI updates
    const [optimisticTasks, addOptimisticTask] = useOptimistic(
        tasks,
        (state, newTask: TaskDTO) => [...state, newTask]
    )

    // Create task with optimistic update
    const createTask = useCallback(async (dto: CreateTaskDTO): Promise<TaskDTO> => {
        const command = new CreateTaskCommand(
            repositories.taskRepository,
            repositories.staffRepository,
            repositories.projectRepository,
            services.validationService,
            services.eventBus
        )

        // Optimistic update for instant feedback
        const tempTask: TaskDTO = {
            id: `temp-${Date.now()}`,
            title: dto.title,
            startDate: dto.startDate,
            durationDays: dto.durationDays,
            endDate: '', // Will be calculated
            status: dto.status || 'not_started',
            assignee: dto.assignee,
            description: dto.description,
            staffId: dto.staffId,
            staffLine: dto.staffLine,
            projectId: dto.projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        startTransition(() => {
            addOptimisticTask(tempTask)
        })

        try {
            const task = await command.execute(dto)
            dispatch(upsertTask({ projectId: dto.projectId, task: task as any }))
            return task
        } catch (error) {
            // Rollback optimistic update on error
            console.error('Failed to create task:', error)
            throw error
        }
    }, [repositories, services, dispatch, startTransition, addOptimisticTask])

    // Update task
    const updateTask = useCallback(async (taskId: string, updates: UpdateTaskDTO): Promise<TaskDTO> => {
        const command = new UpdateTaskCommand(
            repositories.taskRepository,
            repositories.staffRepository,
            repositories.projectRepository,
            services.validationService,
            services.eventBus
        )

        try {
            const task = await command.execute(taskId, updates)
            // Redux store is updated via repository
            return task
        } catch (error) {
            console.error('Failed to update task:', error)
            throw error
        }
    }, [repositories, services])

    // Delete task
    const deleteTaskAction = useCallback(async (taskId: string): Promise<void> => {
        try {
            await repositories.taskRepository.delete(taskId)
            // Redux store is updated via repository
        } catch (error) {
            console.error('Failed to delete task:', error)
            throw error
        }
    }, [repositories])

    // Move task to different staff/line
    const moveTask = useCallback(async (
        taskId: string,
        newStaffId: string,
        newStaffLine: number
    ): Promise<TaskDTO> => {
        return updateTask(taskId, { staffId: newStaffId, staffLine: newStaffLine })
    }, [updateTask])

    // Reschedule task
    const rescheduleTask = useCallback(async (
        taskId: string,
        newStartDate: string,
        newDuration?: number
    ): Promise<TaskDTO> => {
        const updates: UpdateTaskDTO = { startDate: newStartDate }
        if (newDuration !== undefined) {
            updates.durationDays = newDuration
        }
        return updateTask(taskId, updates)
    }, [updateTask])

    // Change task status
    const changeTaskStatus = useCallback(async (
        taskId: string,
        newStatus: string
    ): Promise<TaskDTO> => {
        return updateTask(taskId, { status: newStatus as any })
    }, [updateTask])

    return {
        createTask,
        updateTask,
        deleteTask: deleteTaskAction,
        moveTask,
        rescheduleTask,
        changeTaskStatus,
        isPending
    }
}
