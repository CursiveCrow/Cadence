/**
 * UpdateTaskCommand Use Case
 * Handles task updates with validation and event emission
 */

import { Task } from '../../domain/entities/Task'
import { Staff } from '../../domain/entities/Staff'
import { Project } from '../../domain/entities/Project'
import { ValidationService } from '../../domain/services/ValidationService'
import { EventBus, TaskUpdatedEvent, TaskStatusChangedEvent, TaskMovedEvent, TaskRescheduledEvent } from '../../domain/events/TaskEvents'
import { UpdateTaskDTO, TaskDTO } from '../dto/TaskDTO'
import { TaskRepository, StaffRepository, ProjectRepository } from './CreateTaskCommand'

export class UpdateTaskCommand {
    constructor(
        private taskRepository: TaskRepository,
        private staffRepository: StaffRepository,
        private projectRepository: ProjectRepository,
        private validationService: ValidationService,
        private eventBus: EventBus
    ) { }

    async execute(taskId: string, dto: UpdateTaskDTO): Promise<TaskDTO> {
        // Find existing task
        const existingTask = await this.taskRepository.findById(taskId)
        if (!existingTask) {
            throw new Error(`Task ${taskId} not found`)
        }

        // Find project
        const project = await this.projectRepository.findById(existingTask.projectId)
        if (!project) {
            throw new Error(`Project ${existingTask.projectId} not found`)
        }

        // Create updated task
        let updatedTask = existingTask

        // Handle status change
        if (dto.status !== undefined && dto.status !== existingTask.status) {
            const statusValidation = this.validationService.validateStatusTransition(
                existingTask.status,
                dto.status
            )
            if (!statusValidation.valid) {
                throw new Error(`Status transition failed: ${statusValidation.errors.join(', ')}`)
            }
            updatedTask = updatedTask.updateStatus(dto.status)
        }

        // Handle position change
        if (dto.staffId !== undefined || dto.staffLine !== undefined) {
            const newStaffId = dto.staffId || existingTask.staffId
            const newStaffLine = dto.staffLine ?? existingTask.staffLine

            // Validate new staff exists
            const staff = await this.staffRepository.findById(newStaffId)
            if (!staff) {
                throw new Error(`Staff ${newStaffId} not found`)
            }

            if (newStaffId !== existingTask.staffId || newStaffLine !== existingTask.staffLine) {
                updatedTask = updatedTask.moveTo(newStaffId, newStaffLine)
            }
        }

        // Handle reschedule
        if (dto.startDate !== undefined || dto.durationDays !== undefined) {
            const newStartDate = dto.startDate || existingTask.startDate
            const newDuration = dto.durationDays ?? existingTask.durationDays

            if (newStartDate !== existingTask.startDate || newDuration !== existingTask.durationDays) {
                updatedTask = updatedTask.reschedule(newStartDate, newDuration)
            }
        }

        // Handle other updates
        const otherUpdates: Partial<any> = {}
        if (dto.title !== undefined) otherUpdates.title = dto.title
        if (dto.assignee !== undefined) otherUpdates.assignee = dto.assignee
        if (dto.description !== undefined) otherUpdates.description = dto.description

        if (Object.keys(otherUpdates).length > 0) {
            updatedTask = updatedTask.updateDetails(otherUpdates)
        }

        // Validate updated task
        const staffId = dto.staffId || existingTask.staffId
        const staff = await this.staffRepository.findById(staffId)
        if (!staff) {
            throw new Error(`Staff ${staffId} not found`)
        }

        const validationResult = this.validationService.validateTask(updatedTask, project, staff)
        if (!validationResult.valid) {
            throw new Error(`Task validation failed: ${validationResult.errors.join(', ')}`)
        }

        // Save updated task
        await this.taskRepository.save(updatedTask)

        // Emit appropriate events
        const events: any[] = []

        // Always emit general update event
        events.push(new TaskUpdatedEvent({
            task: updatedTask,
            previousTask: existingTask,
            changes: dto
        }))

        // Emit specific events
        if (dto.status !== undefined && dto.status !== existingTask.status) {
            events.push(new TaskStatusChangedEvent({
                taskId: updatedTask.id,
                previousStatus: existingTask.status,
                newStatus: updatedTask.status,
                task: updatedTask
            }))
        }

        if ((dto.staffId !== undefined && dto.staffId !== existingTask.staffId) ||
            (dto.staffLine !== undefined && dto.staffLine !== existingTask.staffLine)) {
            events.push(new TaskMovedEvent({
                taskId: updatedTask.id,
                previousStaffId: existingTask.staffId,
                previousStaffLine: existingTask.staffLine,
                newStaffId: updatedTask.staffId,
                newStaffLine: updatedTask.staffLine,
                task: updatedTask
            }))
        }

        if ((dto.startDate !== undefined && dto.startDate !== existingTask.startDate) ||
            (dto.durationDays !== undefined && dto.durationDays !== existingTask.durationDays)) {
            events.push(new TaskRescheduledEvent({
                taskId: updatedTask.id,
                previousStartDate: existingTask.startDate,
                previousDuration: existingTask.durationDays,
                newStartDate: updatedTask.startDate,
                newDuration: updatedTask.durationDays,
                task: updatedTask
            }))
        }

        // Publish all events
        for (const event of events) {
            await this.eventBus.publish(event)
        }

        // Return DTO
        return this.toDTO(updatedTask)
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
