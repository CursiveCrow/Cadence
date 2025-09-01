/**
 * ValidationService Domain Service
 * Handles business rule validation
 */

import { Task } from '../entities/Task'
import { Dependency } from '../entities/Dependency'
import { Staff } from '../entities/Staff'
import { Project } from '../entities/Project'
import { TaskStatus } from '../value-objects/TaskStatus'
import { DependencyType } from '../value-objects/DependencyType'

export interface ValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

export class ValidationService {
    /**
     * Validate a task against business rules
     */
    validateTask(task: Task, project: Project, staff: Staff): ValidationResult {
        const errors: string[] = []
        const warnings: string[] = []

        // Check if task is within project bounds
        if (!project.containsDate(task.startDate)) {
            errors.push(`Task start date ${task.startDate} is outside project range`)
        }

        if (!project.containsDate(task.endDate)) {
            errors.push(`Task end date ${task.endDate} is outside project range`)
        }

        // Check if staff line is valid
        if (!staff.isValidLineIndex(task.staffLine)) {
            errors.push(`Staff line ${task.staffLine} is invalid for staff ${staff.name} with ${staff.numberOfLines} lines`)
        }

        // Check duration
        if (task.durationDays <= 0) {
            errors.push('Task duration must be positive')
        }

        if (task.durationDays > 365) {
            warnings.push('Task duration is unusually long (> 1 year)')
        }

        // Check title
        if (!task.title || task.title.trim().length === 0) {
            errors.push('Task must have a title')
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        }
    }

    /**
     * Validate a dependency against business rules
     */
    validateDependency(
        dependency: Dependency,
        srcTask: Task,
        dstTask: Task
    ): ValidationResult {
        const errors: string[] = []
        const warnings: string[] = []

        // Check self-dependency
        if (dependency.srcTaskId === dependency.dstTaskId) {
            errors.push('A task cannot depend on itself')
        }

        // Validate dependency type constraints
        if (dependency.type === DependencyType.FINISH_TO_START) {
            const srcEnd = new Date(srcTask.endDate)
            const dstStart = new Date(dstTask.startDate)

            if (srcEnd > dstStart) {
                errors.push(`Finish-to-start dependency violated: ${srcTask.title} ends after ${dstTask.title} starts`)
            }
        } else if (dependency.type === DependencyType.START_TO_START) {
            if (srcTask.startDate !== dstTask.startDate) {
                warnings.push(`Start-to-start dependency: tasks don't start on the same date`)
            }
        } else if (dependency.type === DependencyType.FINISH_TO_FINISH) {
            if (srcTask.endDate !== dstTask.endDate) {
                warnings.push(`Finish-to-finish dependency: tasks don't end on the same date`)
            }
        } else if (dependency.type === DependencyType.START_TO_FINISH) {
            const srcStart = new Date(srcTask.startDate)
            const dstEnd = new Date(dstTask.endDate)

            if (srcStart > dstEnd) {
                errors.push(`Start-to-finish dependency violated: ${srcTask.title} starts after ${dstTask.title} ends`)
            }
        }

        // Check if tasks are from the same project
        if (srcTask.projectId !== dstTask.projectId) {
            errors.push('Dependencies can only be created between tasks in the same project')
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        }
    }

    /**
     * Validate project consistency
     */
    validateProject(
        project: Project,
        tasks: Task[],
        dependencies: Dependency[],
        staffs: Staff[]
    ): ValidationResult {
        const errors: string[] = []
        const warnings: string[] = []

        // Check for orphaned tasks
        const staffIds = new Set(staffs.map(s => s.id))
        for (const task of tasks) {
            if (!staffIds.has(task.staffId)) {
                errors.push(`Task "${task.title}" references non-existent staff ${task.staffId}`)
            }
        }

        // Check for orphaned dependencies
        const taskIds = new Set(tasks.map(t => t.id))
        for (const dep of dependencies) {
            if (!taskIds.has(dep.srcTaskId)) {
                errors.push(`Dependency ${dep.id} references non-existent source task ${dep.srcTaskId}`)
            }
            if (!taskIds.has(dep.dstTaskId)) {
                errors.push(`Dependency ${dep.id} references non-existent destination task ${dep.dstTaskId}`)
            }
        }

        // Check for duplicate task IDs
        const seenIds = new Set<string>()
        for (const task of tasks) {
            if (seenIds.has(task.id)) {
                errors.push(`Duplicate task ID: ${task.id}`)
            }
            seenIds.add(task.id)
        }

        // Check for empty project
        if (tasks.length === 0) {
            warnings.push('Project has no tasks')
        }

        if (staffs.length === 0) {
            errors.push('Project has no staffs defined')
        }

        // Check project date range
        const projectDuration = project.getDurationInDays()
        if (projectDuration <= 0) {
            errors.push('Project end date must be after start date')
        }

        if (projectDuration > 1825) { // 5 years
            warnings.push('Project duration is unusually long (> 5 years)')
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        }
    }

    /**
     * Validate that task status transitions are allowed
     */
    validateStatusTransition(
        currentStatus: TaskStatus,
        newStatus: TaskStatus
    ): ValidationResult {
        const errors: string[] = []
        const warnings: string[] = []

        // Cannot transition from cancelled
        if (currentStatus === TaskStatus.CANCELLED && newStatus !== TaskStatus.CANCELLED) {
            errors.push('Cannot change status of a cancelled task')
        }

        // Can only reopen completed tasks to in-progress
        if (currentStatus === TaskStatus.COMPLETED) {
            if (newStatus !== TaskStatus.COMPLETED && newStatus !== TaskStatus.IN_PROGRESS) {
                errors.push('Completed tasks can only be reopened to in-progress')
            }
            if (newStatus === TaskStatus.IN_PROGRESS) {
                warnings.push('Reopening a completed task')
            }
        }

        // Warn about unusual transitions
        if (currentStatus === TaskStatus.NOT_STARTED && newStatus === TaskStatus.COMPLETED) {
            warnings.push('Task completed without being in progress')
        }

        if (currentStatus === TaskStatus.IN_PROGRESS && newStatus === TaskStatus.NOT_STARTED) {
            warnings.push('Task reverted from in-progress to not started')
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        }
    }

    /**
     * Validate staff configuration
     */
    validateStaff(staff: Staff): ValidationResult {
        const errors: string[] = []
        const warnings: string[] = []

        if (staff.numberOfLines <= 0) {
            errors.push('Staff must have at least one line')
        }

        if (staff.numberOfLines > 20) {
            warnings.push('Staff has unusually many lines (> 20)')
        }

        if (staff.lineSpacing <= 0) {
            errors.push('Line spacing must be positive')
        }

        if (!staff.name || staff.name.trim().length === 0) {
            errors.push('Staff must have a name')
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        }
    }

    /**
     * Check for scheduling conflicts
     */
    validateScheduleConflicts(tasks: Task[]): ValidationResult {
        const errors: string[] = []
        const warnings: string[] = []

        // Group tasks by staff and line
        const tasksByPosition = new Map<string, Task[]>()

        for (const task of tasks) {
            const key = `${task.staffId}-${task.staffLine}`
            if (!tasksByPosition.has(key)) {
                tasksByPosition.set(key, [])
            }
            tasksByPosition.get(key)!.push(task)
        }

        // Check for overlaps
        for (const [position, positionTasks] of tasksByPosition) {
            for (let i = 0; i < positionTasks.length; i++) {
                for (let j = i + 1; j < positionTasks.length; j++) {
                    const task1 = positionTasks[i]
                    const task2 = positionTasks[j]

                    if (task1.timeRange.overlaps(task2.timeRange)) {
                        warnings.push(
                            `Tasks "${task1.title}" and "${task2.title}" overlap on the same staff line`
                        )
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        }
    }
}
