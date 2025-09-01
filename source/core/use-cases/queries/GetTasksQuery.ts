/**
 * GetTasksQuery Use Case
 * Handles retrieving tasks with various filters
 */

import { Task } from '../../domain/entities/Task'
import { Dependency } from '../../domain/entities/Dependency'
import { TaskService } from '../../domain/services/TaskService'
import { SchedulingService } from '../../domain/services/SchedulingService'
import { TaskQueryDTO, TaskDTO, TaskWithDependenciesDTO } from '../dto/TaskDTO'
import { TaskRepository } from '../commands/CreateTaskCommand'
import { DependencyRepository } from '../commands/CreateDependencyCommand'

export class GetTasksQuery {
    constructor(
        private taskRepository: TaskRepository,
        private dependencyRepository: DependencyRepository,
        private taskService: TaskService,
        private schedulingService: SchedulingService
    ) { }

    /**
     * Get all tasks for a project
     */
    async getByProject(projectId: string): Promise<TaskDTO[]> {
        const tasks = await this.taskRepository.findByProject(projectId)
        return tasks.map(task => this.toDTO(task))
    }

    /**
     * Get a single task by ID
     */
    async getById(taskId: string): Promise<TaskDTO | null> {
        const task = await this.taskRepository.findById(taskId)
        return task ? this.toDTO(task) : null
    }

    /**
     * Get task with its dependencies
     */
    async getWithDependencies(taskId: string): Promise<TaskWithDependenciesDTO | null> {
        const task = await this.taskRepository.findById(taskId)
        if (!task) return null

        const allDependencies = await this.dependencyRepository.findByProject(task.projectId)

        const dependencies = allDependencies.filter(d => d.srcTaskId === taskId)
        const dependents = allDependencies.filter(d => d.dstTaskId === taskId)

        return {
            ...this.toDTO(task),
            dependencies: dependencies.map(d => this.toDependencyDTO(d)),
            dependents: dependents.map(d => this.toDependencyDTO(d))
        }
    }

    /**
     * Get tasks with filters
     */
    async getFiltered(query: TaskQueryDTO): Promise<TaskDTO[]> {
        let tasks: Task[] = []

        if (query.projectId) {
            tasks = await this.taskRepository.findByProject(query.projectId)
        } else {
            // If no project specified, we'd need to get all tasks
            // This would require a findAll method in the repository
            throw new Error('Project ID is required for task queries')
        }

        // Apply filters
        if (query.staffId) {
            tasks = tasks.filter(t => t.staffId === query.staffId)
        }

        if (query.status) {
            tasks = tasks.filter(t => t.status === query.status)
        }

        if (query.assignee) {
            tasks = tasks.filter(t => t.assignee === query.assignee)
        }

        if (query.startDateFrom) {
            const fromDate = new Date(query.startDateFrom)
            tasks = tasks.filter(t => new Date(t.startDate) >= fromDate)
        }

        if (query.startDateTo) {
            const toDate = new Date(query.startDateTo)
            tasks = tasks.filter(t => new Date(t.startDate) <= toDate)
        }

        return tasks.map(task => this.toDTO(task))
    }

    /**
     * Get tasks on critical path
     */
    async getCriticalPath(projectId: string): Promise<TaskDTO[]> {
        const tasks = await this.taskRepository.findByProject(projectId)
        const dependencies = await this.dependencyRepository.findByProject(projectId)

        const criticalPath = this.taskService.calculateCriticalPath(tasks, dependencies)
        return criticalPath.map(task => this.toDTO(task))
    }

    /**
     * Get tasks with optimized lane assignments
     */
    async getWithLanes(projectId: string): Promise<TaskDTO[]> {
        const tasks = await this.taskRepository.findByProject(projectId)
        const dependencies = await this.dependencyRepository.findByProject(projectId)

        const tasksWithLanes = this.schedulingService.assignLanes(tasks, dependencies)
        return tasksWithLanes.map(task => this.toDTO(task))
    }

    /**
     * Get blocked tasks and their blockers
     */
    async getBlockedTasks(projectId: string): Promise<Map<TaskDTO, TaskDTO[]>> {
        const tasks = await this.taskRepository.findByProject(projectId)
        const dependencies = await this.dependencyRepository.findByProject(projectId)

        const blocked = this.taskService.findBlockedTasks(tasks, dependencies)

        const result = new Map<TaskDTO, TaskDTO[]>()
        for (const [task, blockers] of blocked) {
            result.set(
                this.toDTO(task),
                blockers.map(b => this.toDTO(b))
            )
        }

        return result
    }

    /**
     * Get overlapping tasks
     */
    async getOverlappingTasks(projectId: string): Promise<Array<[TaskDTO, TaskDTO]>> {
        const tasks = await this.taskRepository.findByProject(projectId)
        const overlapping = this.taskService.findOverlappingTasks(tasks)

        return overlapping.map(([task1, task2]) => [
            this.toDTO(task1),
            this.toDTO(task2)
        ])
    }

    private toDTO(task: Task): TaskDTO {
        return {
            id: task.id,
            title: task.title,
            startDate: task.startDate,
            durationDays: task.durationDays,
            endDate: task.endDate,
            status: task.status,
            assignee: task.assignee,
            description: task.description,
            staffId: task.staffId,
            staffLine: task.staffLine,
            laneIndex: task.laneIndex,
            projectId: task.projectId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }
    }

    private toDependencyDTO(dependency: Dependency): any {
        return {
            id: dependency.id,
            srcTaskId: dependency.srcTaskId,
            dstTaskId: dependency.dstTaskId,
            type: dependency.type,
            projectId: dependency.projectId,
            createdAt: dependency.createdAt,
            updatedAt: dependency.updatedAt
        }
    }
}
