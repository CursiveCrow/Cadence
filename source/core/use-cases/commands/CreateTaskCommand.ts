/**
 * CreateTaskCommand Use Case
 * Handles the creation of new tasks with validation and event emission
 */

import { Task } from '../../domain/entities/Task'
import { Staff } from '../../domain/entities/Staff'
import { Project } from '../../domain/entities/Project'
import { TaskStatus } from '../../domain/value-objects/TaskStatus'
import { ValidationService } from '../../domain/services/ValidationService'
import { EventBus, TaskCreatedEvent } from '../../domain/events/TaskEvents'
import { CreateTaskDTO, TaskDTO } from '../dto/TaskDTO'

export interface TaskRepository {
    findById(id: string): Promise<Task | null>
    findByProject(projectId: string): Promise<Task[]>
    save(task: Task): Promise<void>
    delete(id: string): Promise<void>
}

export interface StaffRepository {
    findById(id: string): Promise<Staff | null>
    findByProject(projectId: string): Promise<Staff[]>
}

export interface ProjectRepository {
    findById(id: string): Promise<Project | null>
}

export class CreateTaskCommand {
    constructor(
        private taskRepository: TaskRepository,
        private staffRepository: StaffRepository,
        private projectRepository: ProjectRepository,
        private validationService: ValidationService,
        private eventBus: EventBus
    ) { }

    async execute(dto: CreateTaskDTO): Promise<TaskDTO> {
        // Validate project exists
        const project = await this.projectRepository.findById(dto.projectId)
        if (!project) {
            throw new Error(`Project ${dto.projectId} not found`)
        }

        // Validate staff exists
        const staff = await this.staffRepository.findById(dto.staffId)
        if (!staff) {
            throw new Error(`Staff ${dto.staffId} not found`)
        }

        // Create task entity
        const taskId = this.generateTaskId()
        const task = Task.create({
            id: taskId,
            title: dto.title,
            startDate: dto.startDate,
            durationDays: dto.durationDays,
            status: dto.status || TaskStatus.NOT_STARTED,
            assignee: dto.assignee,
            description: dto.description,
            staffId: dto.staffId,
            staffLine: dto.staffLine,
            projectId: dto.projectId
        })

        // Validate task
        const validationResult = this.validationService.validateTask(task, project, staff)
        if (!validationResult.valid) {
            throw new Error(`Task validation failed: ${validationResult.errors.join(', ')}`)
        }

        // Check for scheduling conflicts
        const existingTasks = await this.taskRepository.findByProject(dto.projectId)
        const allTasks = [...existingTasks, task]
        const conflictResult = this.validationService.validateScheduleConflicts(allTasks)

        // Log warnings but don't fail on conflicts (they're warnings, not errors)
        if (conflictResult.warnings.length > 0) {
            console.warn('Schedule conflicts detected:', conflictResult.warnings)
        }

        // Save task
        await this.taskRepository.save(task)

        // Emit event
        await this.eventBus.publish(new TaskCreatedEvent({ task }))

        // Return DTO
        return this.toDTO(task)
    }

    private generateTaskId(): string {
        return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
}
