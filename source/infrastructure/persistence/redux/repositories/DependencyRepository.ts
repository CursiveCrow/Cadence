/**
 * Redux implementation of DependencyRepository
 * Handles dependency persistence using Redux store
 */

import { Store } from '@reduxjs/toolkit'
import { Dependency } from '../../../../core/domain/entities/Dependency'
import { DependencyRepository as IDependencyRepository } from '../../../../core/use-cases/commands/CreateDependencyCommand'

export class ReduxDependencyRepository implements IDependencyRepository {
    constructor(private store: Store) { }

    async findById(id: string): Promise<Dependency | null> {
        const state = this.store.getState() as any
        const dependencies = state.dependencies?.byProjectId || {}

        for (const projectDeps of Object.values(dependencies)) {
            const projectDepsMap = projectDeps as Record<string, any>
            if (projectDepsMap[id]) {
                return Dependency.fromPersistence(projectDepsMap[id])
            }
        }

        return null
    }

    async findByProject(projectId: string): Promise<Dependency[]> {
        const state = this.store.getState() as any
        const projectDeps = state.dependencies?.byProjectId?.[projectId] || {}

        return Object.values(projectDeps).map((depData: any) =>
            Dependency.fromPersistence(depData)
        )
    }

    async findByTask(taskId: string): Promise<Dependency[]> {
        // We need to find the project ID first
        const state = this.store.getState() as any
        const allDependencies: Dependency[] = []

        const dependenciesByProject = state.dependencies?.byProjectId || {}

        for (const projectDeps of Object.values(dependenciesByProject)) {
            const projectDepsMap = projectDeps as Record<string, any>
            for (const depData of Object.values(projectDepsMap)) {
                const dep = Dependency.fromPersistence(depData as any)
                if (dep.srcTaskId === taskId || dep.dstTaskId === taskId) {
                    allDependencies.push(dep)
                }
            }
        }

        return allDependencies
    }

    async save(dependency: Dependency): Promise<void> {
        const depData = dependency.toJSON()

        // Dispatch action to update Redux store
        this.store.dispatch({
            type: 'dependencies/upsertDependency',
            payload: {
                projectId: dependency.projectId,
                dependency: depData
            }
        })
    }

    async delete(id: string): Promise<void> {
        // Find the dependency first to get its project ID
        const dependency = await this.findById(id)
        if (!dependency) return

        // Dispatch action to delete from Redux store
        this.store.dispatch({
            type: 'dependencies/deleteDependency',
            payload: {
                projectId: dependency.projectId,
                dependencyId: id
            }
        })
    }
}
