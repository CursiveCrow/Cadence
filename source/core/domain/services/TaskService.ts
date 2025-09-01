/**
 * TaskService Domain Service
 * Handles complex business logic for tasks
 */

import { Task } from '../entities/Task'
import { Dependency } from '../entities/Dependency'
import { TaskStatus } from '../value-objects/TaskStatus'
import { TimeRange } from '../value-objects/TimeRange'

export class TaskService {
    /**
     * Calculate the critical path through a set of tasks
     */
    calculateCriticalPath(tasks: Task[], dependencies: Dependency[]): Task[] {
        const taskMap = new Map(tasks.map(t => [t.id, t]))
        const graph = this.buildDependencyGraph(tasks, dependencies)
        const criticalPath: Task[] = []

        // Find tasks with no dependencies (start nodes)
        const startTasks = tasks.filter(task =>
            !dependencies.some(dep => dep.dstTaskId === task.id)
        )

        // Use dynamic programming to find longest path
        const memo = new Map<string, { duration: number; path: string[] }>()

        function findLongestPath(taskId: string): { duration: number; path: string[] } {
            if (memo.has(taskId)) {
                return memo.get(taskId)!
            }

            const task = taskMap.get(taskId)
            if (!task) return { duration: 0, path: [] }

            const dependents = graph.get(taskId) || []
            if (dependents.length === 0) {
                const result = { duration: task.durationDays, path: [taskId] }
                memo.set(taskId, result)
                return result
            }

            let maxDuration = 0
            let maxPath: string[] = []

            for (const dependentId of dependents) {
                const { duration, path } = findLongestPath(dependentId)
                if (duration > maxDuration) {
                    maxDuration = duration
                    maxPath = path
                }
            }

            const result = {
                duration: task.durationDays + maxDuration,
                path: [taskId, ...maxPath]
            }
            memo.set(taskId, result)
            return result
        }

        // Find the longest path from all start nodes
        let maxDuration = 0
        let maxPath: string[] = []

        for (const startTask of startTasks) {
            const { duration, path } = findLongestPath(startTask.id)
            if (duration > maxDuration) {
                maxDuration = duration
                maxPath = path
            }
        }

        return maxPath.map(id => taskMap.get(id)!).filter(Boolean)
    }

    /**
     * Check if tasks can be scheduled without conflicts
     */
    validateSchedule(tasks: Task[], dependencies: Dependency[]): { valid: boolean; conflicts: string[] } {
        const conflicts: string[] = []
        const taskMap = new Map(tasks.map(t => [t.id, t]))

        for (const dep of dependencies) {
            const srcTask = taskMap.get(dep.srcTaskId)
            const dstTask = taskMap.get(dep.dstTaskId)

            if (!srcTask || !dstTask) continue

            if (dep.isFinishToStart()) {
                const srcEnd = new Date(srcTask.endDate)
                const dstStart = new Date(dstTask.startDate)
                if (srcEnd > dstStart) {
                    conflicts.push(`Task ${dstTask.title} starts before ${srcTask.title} finishes`)
                }
            } else if (dep.isStartToStart()) {
                const srcStart = new Date(srcTask.startDate)
                const dstStart = new Date(dstTask.startDate)
                if (srcStart.getTime() !== dstStart.getTime()) {
                    conflicts.push(`Tasks ${srcTask.title} and ${dstTask.title} must start at the same time`)
                }
            } else if (dep.isFinishToFinish()) {
                const srcEnd = new Date(srcTask.endDate)
                const dstEnd = new Date(dstTask.endDate)
                if (srcEnd.getTime() !== dstEnd.getTime()) {
                    conflicts.push(`Tasks ${srcTask.title} and ${dstTask.title} must finish at the same time`)
                }
            }
        }

        return { valid: conflicts.length === 0, conflicts }
    }

    /**
     * Auto-schedule tasks based on dependencies
     */
    autoSchedule(tasks: Task[], dependencies: Dependency[], projectStartDate: string): Task[] {
        const taskMap = new Map(tasks.map(t => [t.id, t]))
        const scheduled = new Map<string, Task>()
        const visited = new Set<string>()

        // Build reverse dependency graph (who depends on me)
        const reverseDeps = new Map<string, string[]>()
        for (const dep of dependencies) {
            if (!reverseDeps.has(dep.dstTaskId)) {
                reverseDeps.set(dep.dstTaskId, [])
            }
            reverseDeps.get(dep.dstTaskId)!.push(dep.srcTaskId)
        }

        // Topological sort
        const sorted = this.topologicalSort(tasks, dependencies)

        for (const taskId of sorted) {
            const task = taskMap.get(taskId)
            if (!task) continue

            const predecessors = reverseDeps.get(taskId) || []

            if (predecessors.length === 0) {
                // No dependencies, use project start date
                const scheduledTask = task.reschedule(projectStartDate)
                scheduled.set(taskId, scheduledTask)
            } else {
                // Calculate start date based on predecessors
                let latestDate = new Date(projectStartDate)

                for (const predId of predecessors) {
                    const pred = scheduled.get(predId)
                    if (pred) {
                        const predEnd = new Date(pred.endDate)
                        if (predEnd > latestDate) {
                            latestDate = predEnd
                        }
                    }
                }

                // Add one day buffer after latest predecessor
                latestDate.setDate(latestDate.getDate() + 1)
                const scheduledTask = task.reschedule(latestDate.toISOString().split('T')[0])
                scheduled.set(taskId, scheduledTask)
            }
        }

        return Array.from(scheduled.values())
    }

    /**
     * Find tasks that overlap in time on the same staff
     */
    findOverlappingTasks(tasks: Task[]): Array<[Task, Task]> {
        const overlapping: Array<[Task, Task]> = []

        for (let i = 0; i < tasks.length; i++) {
            for (let j = i + 1; j < tasks.length; j++) {
                const task1 = tasks[i]
                const task2 = tasks[j]

                // Check if on same staff and same line
                if (task1.staffId === task2.staffId && task1.staffLine === task2.staffLine) {
                    // Check if time ranges overlap
                    if (task1.timeRange.overlaps(task2.timeRange)) {
                        overlapping.push([task1, task2])
                    }
                }
            }
        }

        return overlapping
    }

    /**
     * Calculate task completion percentage for a project
     */
    calculateCompletionPercentage(tasks: Task[]): number {
        if (tasks.length === 0) return 0

        const completedTasks = tasks.filter(t => t.isCompleted())
        return Math.round((completedTasks.length / tasks.length) * 100)
    }

    /**
     * Get tasks by status
     */
    getTasksByStatus(tasks: Task[], status: TaskStatus): Task[] {
        return tasks.filter(t => t.status === status)
    }

    /**
     * Find blocked tasks and their blockers
     */
    findBlockedTasks(tasks: Task[], dependencies: Dependency[]): Map<Task, Task[]> {
        const blocked = new Map<Task, Task[]>()
        const taskMap = new Map(tasks.map(t => [t.id, t]))

        for (const task of tasks) {
            if (!task.isBlocked()) continue

            const blockers: Task[] = []

            // Find all tasks that this task depends on
            const taskDeps = dependencies.filter(d => d.dstTaskId === task.id)

            for (const dep of taskDeps) {
                const blocker = taskMap.get(dep.srcTaskId)
                if (blocker && !blocker.isCompleted()) {
                    blockers.push(blocker)
                }
            }

            if (blockers.length > 0) {
                blocked.set(task, blockers)
            }
        }

        return blocked
    }

    private buildDependencyGraph(tasks: Task[], dependencies: Dependency[]): Map<string, string[]> {
        const graph = new Map<string, string[]>()

        for (const task of tasks) {
            graph.set(task.id, [])
        }

        for (const dep of dependencies) {
            const dependents = graph.get(dep.srcTaskId) || []
            dependents.push(dep.dstTaskId)
            graph.set(dep.srcTaskId, dependents)
        }

        return graph
    }

    private topologicalSort(tasks: Task[], dependencies: Dependency[]): string[] {
        const graph = this.buildDependencyGraph(tasks, dependencies)
        const visited = new Set<string>()
        const result: string[] = []

        function dfs(taskId: string) {
            if (visited.has(taskId)) return
            visited.add(taskId)

            const dependents = graph.get(taskId) || []
            for (const dependentId of dependents) {
                dfs(dependentId)
            }

            result.unshift(taskId)
        }

        for (const task of tasks) {
            if (!visited.has(task.id)) {
                dfs(task.id)
            }
        }

        return result
    }
}
