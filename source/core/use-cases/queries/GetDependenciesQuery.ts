/**
 * GetDependenciesQuery Use Case
 * Handles retrieving dependencies with various filters
 */

import { Dependency } from '../../domain/entities/Dependency'
import { DependencyService } from '../../domain/services/DependencyService'
import { DependencyQueryDTO, DependencyDTO } from '../dto/TaskDTO'
import { DependencyRepository } from '../commands/CreateDependencyCommand'

export class GetDependenciesQuery {
    constructor(
        private dependencyRepository: DependencyRepository,
        private dependencyService: DependencyService
    ) { }

    /**
     * Get all dependencies for a project
     */
    async getByProject(projectId: string): Promise<DependencyDTO[]> {
        const dependencies = await this.dependencyRepository.findByProject(projectId)
        return dependencies.map(dep => this.toDTO(dep))
    }

    /**
     * Get a single dependency by ID
     */
    async getById(dependencyId: string): Promise<DependencyDTO | null> {
        const dependency = await this.dependencyRepository.findById(dependencyId)
        return dependency ? this.toDTO(dependency) : null
    }

    /**
     * Get dependencies for a specific task
     */
    async getByTask(taskId: string): Promise<{
        incoming: DependencyDTO[]
        outgoing: DependencyDTO[]
    }> {
        const dependencies = await this.dependencyRepository.findByTask(taskId)

        const incoming = dependencies.filter(d => d.dstTaskId === taskId)
        const outgoing = dependencies.filter(d => d.srcTaskId === taskId)

        return {
            incoming: incoming.map(d => this.toDTO(d)),
            outgoing: outgoing.map(d => this.toDTO(d))
        }
    }

    /**
     * Get dependencies with filters
     */
    async getFiltered(query: DependencyQueryDTO): Promise<DependencyDTO[]> {
        let dependencies: Dependency[] = []

        if (query.projectId) {
            dependencies = await this.dependencyRepository.findByProject(query.projectId)
        } else if (query.taskId) {
            dependencies = await this.dependencyRepository.findByTask(query.taskId)
        } else {
            throw new Error('Either projectId or taskId is required for dependency queries')
        }

        // Apply filters
        if (query.type) {
            dependencies = dependencies.filter(d => d.type === query.type)
        }

        return dependencies.map(dep => this.toDTO(dep))
    }

    /**
     * Get transitive dependencies of a task
     */
    async getTransitiveDependencies(taskId: string, projectId: string): Promise<{
        dependencies: string[]
        dependents: string[]
    }> {
        const allDependencies = await this.dependencyRepository.findByProject(projectId)

        const dependencies = this.dependencyService.getTransitiveDependencies(taskId, allDependencies)
        const dependents = this.dependencyService.getTransitiveDependents(taskId, allDependencies)

        return {
            dependencies: Array.from(dependencies),
            dependents: Array.from(dependents)
        }
    }

    /**
     * Find redundant dependencies in a project
     */
    async getRedundantDependencies(projectId: string): Promise<DependencyDTO[]> {
        const dependencies = await this.dependencyRepository.findByProject(projectId)
        const redundant = this.dependencyService.findRedundantDependencies(dependencies)
        return redundant.map(dep => this.toDTO(dep))
    }

    /**
     * Check if a dependency can be safely removed
     */
    async canRemoveDependency(dependencyId: string): Promise<boolean> {
        const dependency = await this.dependencyRepository.findById(dependencyId)
        if (!dependency) {
            throw new Error(`Dependency ${dependencyId} not found`)
        }

        const allDependencies = await this.dependencyRepository.findByProject(dependency.projectId)
        return this.dependencyService.canRemoveDependency(dependency, allDependencies)
    }

    /**
     * Suggest potential dependencies based on task relationships
     */
    async suggestDependencies(projectId: string): Promise<Array<{
        srcTaskId: string
        dstTaskId: string
        type: string
        reason: string
    }>> {
        // This would require access to TaskRepository
        // For now, returning empty array as this is an advanced feature
        return []
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
