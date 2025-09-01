/**
 * Data Transfer Objects for Task operations
 * These DTOs define the shape of data crossing boundaries
 */

import { TaskStatus } from '../../domain/value-objects/TaskStatus'
import { DependencyType } from '../../domain/value-objects/DependencyType'

export interface CreateTaskDTO {
    title: string
    startDate: string
    durationDays: number
    status?: TaskStatus
    assignee?: string
    description?: string
    staffId: string
    staffLine: number
    projectId: string
}

export interface UpdateTaskDTO {
    title?: string
    startDate?: string
    durationDays?: number
    status?: TaskStatus
    assignee?: string
    description?: string
    staffId?: string
    staffLine?: number
}

export interface TaskDTO {
    id: string
    title: string
    startDate: string
    durationDays: number
    endDate: string
    status: TaskStatus
    assignee?: string
    description?: string
    staffId: string
    staffLine: number
    laneIndex?: number
    projectId: string
    createdAt: string
    updatedAt: string
}

export interface CreateDependencyDTO {
    srcTaskId: string
    dstTaskId: string
    type: DependencyType
    projectId: string
}

export interface DependencyDTO {
    id: string
    srcTaskId: string
    dstTaskId: string
    type: DependencyType
    projectId: string
    createdAt: string
    updatedAt: string
}

export interface StaffDTO {
    id: string
    name: string
    numberOfLines: number
    lineSpacing: number
    position: number
    projectId: string
    timeSignature?: string
    createdAt: string
    updatedAt: string
}

export interface ProjectDTO {
    id: string
    name: string
    startDate: string
    endDate: string
    createdAt: string
    updatedAt: string
}

export interface TaskQueryDTO {
    projectId?: string
    staffId?: string
    status?: TaskStatus
    startDateFrom?: string
    startDateTo?: string
    assignee?: string
}

export interface DependencyQueryDTO {
    projectId?: string
    taskId?: string
    type?: DependencyType
}

export interface TaskMoveDTO {
    taskId: string
    newStaffId: string
    newStaffLine: number
}

export interface TaskRescheduleDTO {
    taskId: string
    newStartDate: string
    newDurationDays?: number
}

export interface BatchUpdateTasksDTO {
    taskIds: string[]
    updates: UpdateTaskDTO
}

export interface TaskValidationResultDTO {
    valid: boolean
    errors: string[]
    warnings: string[]
}

export interface ProjectStatisticsDTO {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    blockedTasks: number
    completionPercentage: number
    criticalPathLength: number
    totalDependencies: number
}

export interface TaskWithDependenciesDTO extends TaskDTO {
    dependencies: DependencyDTO[]
    dependents: DependencyDTO[]
}
