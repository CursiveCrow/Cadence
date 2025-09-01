import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from './ui/store'
import type { Task, Dependency } from '@cadence/core'

export const selectProjectId = (state: RootState) => state.ui.activeProjectId

export const selectTasksByProject = (projectId: string) => (state: RootState): Record<string, Task> => state.tasks.byProjectId[projectId] || {}
export const selectDependenciesByProject = (projectId: string) => (state: RootState): Record<string, Dependency> => state.dependencies.byProjectId[projectId] || {}

export const makeSelectTaskListForProject = () => createSelector([
    (_: RootState, projectId: string) => projectId,
    (state: RootState) => state.tasks.byProjectId,
], (projectId, byProject) => {
    const map = byProject[projectId] || {}
    return Object.values(map)
})

export const makeSelectDependenciesForProject = () => createSelector([
    (_: RootState, projectId: string) => projectId,
    (state: RootState) => state.dependencies.byProjectId,
], (projectId, byProject) => {
    const map = byProject[projectId] || {}
    return Object.values(map)
})

export const makeSelectSelectedTask = () => createSelector([
    (state: RootState) => state.selection.ids,
    (_: RootState, projectId: string) => projectId,
    (state: RootState) => state.tasks.byProjectId,
], (selection, projectId, byProject) => {
    const selectedId = selection[0]
    if (!selectedId) return undefined
    const byId = byProject[projectId] || {}
    return byId[selectedId]
})
