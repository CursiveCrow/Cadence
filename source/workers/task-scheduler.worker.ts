/**
 * Task Scheduler Worker
 * Handles heavy computation for task scheduling in a separate thread
 */

import { Task } from '../core/domain/entities/Task'
import { Dependency } from '../core/domain/entities/Dependency'
import { SchedulingService } from '../core/domain/services/SchedulingService'
import { DependencyService } from '../core/domain/services/DependencyService'
import { TaskService } from '../core/domain/services/TaskService'

// Worker message types
interface WorkerMessage {
    id: string
    task: {
        type: 'ASSIGN_LANES' | 'AUTO_SCHEDULE' | 'OPTIMIZE_RESOURCES' | 'CALCULATE_CRITICAL_PATH'
        data: any
    }
}

interface WorkerResponse {
    id: string
    result?: any
    error?: string
}

// Initialize services
const dependencyService = new DependencyService()
const taskService = new TaskService()
const schedulingService = new SchedulingService(dependencyService, taskService)

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
    const { id, task } = event.data

    try {
        let result: any

        switch (task.type) {
            case 'ASSIGN_LANES': {
                const { tasks, dependencies } = task.data
                const taskEntities = tasks.map((t: any) => Task.fromPersistence(t))
                const depEntities = dependencies.map((d: any) => Dependency.fromPersistence(d))

                const optimized = schedulingService.assignLanes(taskEntities, depEntities)
                result = optimized.map(t => t.toJSON())
                break
            }

            case 'AUTO_SCHEDULE': {
                const { tasks, dependencies, projectStartDate } = task.data
                const taskEntities = tasks.map((t: any) => Task.fromPersistence(t))
                const depEntities = dependencies.map((d: any) => Dependency.fromPersistence(d))

                const scheduled = taskService.autoSchedule(taskEntities, depEntities, projectStartDate)
                result = scheduled.map(t => t.toJSON())
                break
            }

            case 'OPTIMIZE_RESOURCES': {
                const { tasks, staffs } = task.data
                const taskEntities = tasks.map((t: any) => Task.fromPersistence(t))

                const optimized = schedulingService.optimizeStaffPositions(taskEntities, staffs)
                result = optimized.map(t => t.toJSON())
                break
            }

            case 'CALCULATE_CRITICAL_PATH': {
                const { tasks, dependencies } = task.data
                const taskEntities = tasks.map((t: any) => Task.fromPersistence(t))
                const depEntities = dependencies.map((d: any) => Dependency.fromPersistence(d))

                const criticalPath = taskService.calculateCriticalPath(taskEntities, depEntities)
                result = criticalPath.map(t => t.toJSON())
                break
            }

            default:
                throw new Error(`Unknown task type: ${task.type}`)
        }

        // Send result back to main thread
        const response: WorkerResponse = { id, result }
        self.postMessage(response)

    } catch (error) {
        // Send error back to main thread
        const response: WorkerResponse = {
            id,
            error: error instanceof Error ? error.message : String(error)
        }
        self.postMessage(response)
    }
})

// Log that worker is ready
console.log('Task scheduler worker initialized')
