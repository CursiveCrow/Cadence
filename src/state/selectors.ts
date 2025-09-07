import { createSelector } from '@reduxjs/toolkit'
import { RootState } from './store'
import { dayIndexFromISO } from '../renderer/utils'
import { PROJECT_START_DATE } from '../config'
import type { Task } from '../types'

// Base selectors
export const selectTasks = (state: RootState) => state.tasks.list
export const selectStaffs = (state: RootState) => state.staffs.list
export const selectDependencies = (state: RootState) => state.dependencies.list
export const selectUI = (state: RootState) => state.ui
export const selectSelection = (state: RootState) => state.ui.selection
export const selectViewport = (state: RootState) => state.ui.viewport
export const selectVerticalScale = (state: RootState) => state.ui.verticalScale

// Memoized selectors for complex queries

// Get tasks grouped by staff
export const selectTasksByStaff = createSelector(
    [selectTasks, selectStaffs],
    (tasks, staffs) => {
        const tasksByStaff = new Map<string, Task[]>()

        // Initialize with empty arrays for all staffs
        staffs.forEach(staff => {
            tasksByStaff.set(staff.id, [])
        })

        // Group tasks by staff
        tasks.forEach(task => {
            const staffTasks = tasksByStaff.get(task.staffId) || []
            staffTasks.push(task)
            tasksByStaff.set(task.staffId, staffTasks)
        })

        return tasksByStaff
    }
)

// Get tasks sorted by start date
export const selectTasksSortedByDate = createSelector(
    [selectTasks],
    (tasks) => {
        return [...tasks].sort((a, b) => {
            const aDay = dayIndexFromISO(a.startDate, PROJECT_START_DATE)
            const bDay = dayIndexFromISO(b.startDate, PROJECT_START_DATE)
            return aDay - bDay
        })
    }
)

// Get tasks that are currently visible in viewport
export const selectVisibleTasks = createSelector(
    [selectTasks, selectViewport],
    (tasks, viewport) => {
        // This would be expanded with actual viewport culling logic
        const leftBound = viewport.x - 10  // Add some padding
        const rightBound = viewport.x + 100 / viewport.zoom // Approximation

        return tasks.filter(task => {
            const dayIndex = dayIndexFromISO(task.startDate, PROJECT_START_DATE)
            return dayIndex >= leftBound && dayIndex <= rightBound
        })
    }
)

// Get selected tasks with full task data
export const selectSelectedTasks = createSelector(
    [selectTasks, selectSelection],
    (tasks, selection) => {
        return tasks.filter(task => selection.includes(task.id))
    }
)

// Get tasks by status
export const selectTasksByStatus = createSelector(
    [selectTasks],
    (tasks) => {
        const tasksByStatus = new Map<string, Task[]>()

        tasks.forEach(task => {
            const status = String(task.status)
            const statusTasks = tasksByStatus.get(status) || []
            statusTasks.push(task)
            tasksByStatus.set(status, statusTasks)
        })

        return tasksByStatus
    }
)

// Get task dependencies with source and destination task data
export const selectDependenciesWithTasks = createSelector(
    [selectDependencies, selectTasks],
    (dependencies, tasks) => {
        const taskMap = new Map(tasks.map(task => [task.id, task]))

        return dependencies.map(dep => ({
            ...dep,
            sourceTask: taskMap.get(dep.srcTaskId),
            destinationTask: taskMap.get(dep.dstTaskId)
        })).filter(dep => dep.sourceTask && dep.destinationTask) // Only include valid dependencies
    }
)

// Get tasks that have no dependencies (can be started immediately)
export const selectIndependentTasks = createSelector(
    [selectTasks, selectDependencies],
    (tasks, dependencies) => {
        const dependentTaskIds = new Set(dependencies.map(dep => dep.dstTaskId))
        return tasks.filter(task => !dependentTaskIds.has(task.id))
    }
)

// Get tasks that are blocking other tasks
export const selectBlockingTasks = createSelector(
    [selectTasks, selectDependencies],
    (tasks, dependencies) => {
        const blockingTaskIds = new Set(dependencies.map(dep => dep.srcTaskId))
        return tasks.filter(task => blockingTaskIds.has(task.id))
    }
)

// Get project timeline bounds (earliest start to latest end)
export const selectProjectTimeBounds = createSelector(
    [selectTasks],
    (tasks) => {
        if (tasks.length === 0) {
            const today = dayIndexFromISO(new Date().toISOString().split('T')[0], PROJECT_START_DATE)
            return { start: today, end: today + 30 } // Default 30-day view
        }

        let earliestDay = Infinity
        let latestDay = -Infinity

        tasks.forEach(task => {
            const startDay = dayIndexFromISO(task.startDate, PROJECT_START_DATE)
            const endDay = startDay + task.durationDays

            if (startDay < earliestDay) earliestDay = startDay
            if (endDay > latestDay) latestDay = endDay
        })

        return {
            start: Math.max(0, earliestDay),
            end: latestDay
        }
    }
)

// Get staff utilization (how many tasks per staff)
export const selectStaffUtilization = createSelector(
    [selectTasksByStaff, selectStaffs],
    (tasksByStaff, staffs) => {
        return staffs.map(staff => ({
            staff,
            taskCount: tasksByStaff.get(staff.id)?.length || 0,
            utilization: (tasksByStaff.get(staff.id)?.length || 0) / Math.max(1, staffs.length) // Normalized utilization
        })).sort((a, b) => b.utilization - a.utilization) // Sort by highest utilization first
    }
)

// Get tasks with conflicts (overlapping tasks on same staff/line)
export const selectTaskConflicts = createSelector(
    [selectTasks],
    (tasks) => {
        const conflicts: Array<{ task1: Task; task2: Task; type: 'overlap' | 'same_position' }> = []

        for (let i = 0; i < tasks.length; i++) {
            for (let j = i + 1; j < tasks.length; j++) {
                const task1 = tasks[i]
                const task2 = tasks[j]

                // Check if tasks are on the same staff and line
                if (task1.staffId === task2.staffId && task1.staffLine === task2.staffLine) {
                    const start1 = dayIndexFromISO(task1.startDate, PROJECT_START_DATE)
                    const end1 = start1 + task1.durationDays
                    const start2 = dayIndexFromISO(task2.startDate, PROJECT_START_DATE)
                    const end2 = start2 + task2.durationDays

                    // Check for exact same position
                    if (start1 === start2) {
                        conflicts.push({ task1, task2, type: 'same_position' })
                    }
                    // Check for overlap
                    else if (!(end1 <= start2 || end2 <= start1)) {
                        conflicts.push({ task1, task2, type: 'overlap' })
                    }
                }
            }
        }

        return conflicts
    }
)

// Get completion statistics
export const selectCompletionStats = createSelector(
    [selectTasksByStatus],
    (tasksByStatus) => {
        const totalTasks = Array.from(tasksByStatus.values()).reduce((sum, tasks) => sum + tasks.length, 0)
        const completedTasks = tasksByStatus.get('completed')?.length || 0
        const inProgressTasks = tasksByStatus.get('in_progress')?.length || 0
        const notStartedTasks = tasksByStatus.get('not_started')?.length || 0
        const blockedTasks = tasksByStatus.get('blocked')?.length || 0

        return {
            total: totalTasks,
            completed: completedTasks,
            inProgress: inProgressTasks,
            notStarted: notStartedTasks,
            blocked: blockedTasks,
            completionPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
        }
    }
)

// Get critical path (longest chain of dependencies)
export const selectCriticalPath = createSelector(
    [selectTasks, selectDependenciesWithTasks],
    (tasks, dependencies) => {
        // Simple critical path calculation
        const taskMap = new Map(tasks.map(task => [task.id, task]))
        const dependencyGraph = new Map<string, string[]>()

        // Build dependency graph
        tasks.forEach(task => {
            dependencyGraph.set(task.id, [])
        })

        dependencies.forEach(dep => {
            if (dep.sourceTask && dep.destinationTask) {
                const successors = dependencyGraph.get(dep.sourceTask.id) || []
                successors.push(dep.destinationTask.id)
                dependencyGraph.set(dep.sourceTask.id, successors)
            }
        })

        // Find longest path (simplified algorithm)
        let longestPath: Task[] = []
        let maxDuration = 0

        // Try each task as a potential starting point
        tasks.forEach(startTask => {
            const path = findLongestPath(startTask.id, dependencyGraph, taskMap, new Set())
            const pathDuration = path.reduce((sum: number, task: Task) => sum + task.durationDays, 0)

            if (pathDuration > maxDuration) {
                maxDuration = pathDuration
                longestPath = path
            }
        })

        return {
            path: longestPath,
            totalDuration: maxDuration
        }
    }
)

// Helper method for critical path calculation
function findLongestPath(
    taskId: string,
    dependencyGraph: Map<string, string[]>,
    taskMap: Map<string, Task>,
    visited: Set<string>
): Task[] {
    if (visited.has(taskId)) return [] // Avoid cycles

    const task = taskMap.get(taskId)
    if (!task) return []

    visited.add(taskId)

    const successors = dependencyGraph.get(taskId) || []
    let longestSuccessorPath: Task[] = []
    let maxSuccessorDuration = 0

    successors.forEach(successorId => {
        const successorPath = findLongestPath(successorId, dependencyGraph, taskMap, new Set(visited))
        const successorDuration = successorPath.reduce((sum: number, t: Task) => sum + t.durationDays, 0)

        if (successorDuration > maxSuccessorDuration) {
            maxSuccessorDuration = successorDuration
            longestSuccessorPath = successorPath
        }
    })

    return [task, ...longestSuccessorPath]
}

// Get next available tasks (no pending dependencies)
export const selectAvailableTasks = createSelector(
    [selectTasks, selectDependenciesWithTasks],
    (tasks, dependencies) => {
        const pendingDependencies = new Set<string>()

        dependencies.forEach(dep => {
            if (dep.sourceTask && dep.sourceTask.status !== 'completed') {
                pendingDependencies.add(dep.dstTaskId)
            }
        })

        return tasks.filter(task =>
            task.status === 'not_started' && !pendingDependencies.has(task.id)
        )
    }
)

// Get staff workload distribution
export const selectStaffWorkload = createSelector(
    [selectTasksByStaff, selectStaffs],
    (tasksByStaff, staffs) => {
        return staffs.map(staff => {
            const staffTasks = tasksByStaff.get(staff.id) || []
            const totalDuration = staffTasks.reduce((sum, task) => sum + task.durationDays, 0)
            const completedDuration = staffTasks
                .filter(task => task.status === 'completed')
                .reduce((sum, task) => sum + task.durationDays, 0)

            return {
                staff,
                totalTasks: staffTasks.length,
                totalDuration,
                completedDuration,
                completionRate: totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0,
                activeTasks: staffTasks.filter(task => task.status === 'in_progress').length
            }
        })
    }
)
