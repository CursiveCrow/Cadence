/**
 * CreateDependencyCommand Use Case
 * Handles the creation of task dependencies with validation
 */

import { Dependency } from '../../domain/entities/Dependency'
import { Task } from '../../domain/entities/Task'
import { DependencyService } from '../../domain/services/DependencyService'
import { ValidationService } from '../../domain/services/ValidationService'
import { EventBus, DependencyCreatedEvent } from '../../domain/events/TaskEvents'
import { CreateDependencyDTO, DependencyDTO } from '../dto/TaskDTO'
import { TaskRepository } from './CreateTaskCommand'

export interface DependencyRepository {
    findById(id: string): Promise<Dependency | null>
    findByProject(projectId: string): Promise<Dependency[]>
    findByTask(taskId: string): Promise<Dependency[]>
    save(dependency: Dependency): Promise<void>
    delete(id: string): Promise<void>
}

export class CreateDependencyCommand {
    constructor(
        private dependencyRepository: DependencyRepository,
        private taskRepository: TaskRepository,
        private dependencyService: DependencyService,
        private validationService: ValidationService,
        private eventBus: EventBus
    ) { }

    async execute(dto: CreateDependencyDTO): Promise<DependencyDTO> {
        // Validate source task exists
        const srcTask = await this.taskRepository.findById(dto.srcTaskId)
        if (!srcTask) {
            throw new Error(`Source task ${dto.srcTaskId} not found`)
        }

        // Validate destination task exists
        const dstTask = await this.taskRepository.findById(dto.dstTaskId)
        if (!dstTask) {
            throw new Error(`Destination task ${dto.dstTaskId} not found`)
        }

        // Validate both tasks are in the same project
        if (srcTask.projectId !== dstTask.projectId || srcTask.projectId !== dto.projectId) {
            throw new Error('Dependencies can only be created between tasks in the same project')
        }

        // Check if dependency already exists
        const existingDependencies = await this.dependencyRepository.findByProject(dto.projectId)
        if (this.dependencyService.dependencyExists(dto.srcTaskId, dto.dstTaskId, existingDependencies)) {
            throw new Error(`Dependency already exists between tasks ${dto.srcTaskId} and ${dto.dstTaskId}`)
        }

        // Create dependency entity
        const dependencyId = this.generateDependencyId()
        const dependency = Dependency.create({
            id: dependencyId,
            srcTaskId: dto.srcTaskId,
            dstTaskId: dto.dstTaskId,
            type: dto.type,
            projectId: dto.projectId
        })

        // Validate dependency
        const validationResult = this.validationService.validateDependency(dependency, srcTask, dstTask)
        if (!validationResult.valid) {
            throw new Error(`Dependency validation failed: ${validationResult.errors.join(', ')}`)
        }

        // Check for cycles
        const allTasks = await this.taskRepository.findByProject(dto.projectId)
        if (!this.dependencyService.validateNoCycle(allTasks, existingDependencies, dependency)) {
            throw new Error('Creating this dependency would create a circular dependency')
        }

        // Check if dependency is redundant
        const potentiallyRedundant = [...existingDependencies, dependency]
        const redundantDeps = this.dependencyService.findRedundantDependencies(potentiallyRedundant)
        if (redundantDeps.some(d => d.id === dependency.id)) {
            console.warn(`Dependency between ${dto.srcTaskId} and ${dto.dstTaskId} may be redundant`)
        }

        // Save dependency
        await this.dependencyRepository.save(dependency)

        // Emit event
        await this.eventBus.publish(new DependencyCreatedEvent({ dependency }))

        // Return DTO
        return this.toDTO(dependency)
    }

    private generateDependencyId(): string {
        return `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    private toDTO(dependency: Dependency): DependencyDTO {
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
