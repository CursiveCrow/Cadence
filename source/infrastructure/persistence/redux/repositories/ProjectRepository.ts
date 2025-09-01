/**
 * Redux implementation of ProjectRepository
 * Handles project persistence using Redux store
 */

import { Store } from '@reduxjs/toolkit'
import { Project } from '../../../../core/domain/entities/Project'
import { ProjectRepository as IProjectRepository } from '../../../../core/use-cases/commands/CreateTaskCommand'

export class ReduxProjectRepository implements IProjectRepository {
    constructor(private store: Store) { }

    async findById(id: string): Promise<Project | null> {
        const state = this.store.getState() as any
        const projects = state.projects?.byId || {}

        if (projects[id]) {
            return Project.fromPersistence(projects[id])
        }

        return null
    }

    async findAll(): Promise<Project[]> {
        const state = this.store.getState() as any
        const projects = state.projects?.byId || {}

        return Object.values(projects).map((projectData: any) =>
            Project.fromPersistence(projectData)
        )
    }

    async save(project: Project): Promise<void> {
        const projectData = project.toJSON()

        // Dispatch action to update Redux store
        this.store.dispatch({
            type: 'projects/upsertProject',
            payload: projectData
        })
    }

    async delete(id: string): Promise<void> {
        // Dispatch action to delete from Redux store
        this.store.dispatch({
            type: 'projects/deleteProject',
            payload: { projectId: id }
        })
    }
}
