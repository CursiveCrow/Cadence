/**
 * Dependencies Redux Slice
 * Manages dependency state in the Redux store
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface DependencyData {
    id: string
    srcTaskId: string
    dstTaskId: string
    type: string
    projectId: string
    createdAt: string
    updatedAt: string
}

export interface DependenciesState {
    byProjectId: Record<string, Record<string, DependencyData>>
}

const initialState: DependenciesState = {
    byProjectId: {}
}

type SetDependenciesPayload = { projectId: string; dependencies: Record<string, DependencyData> }
type UpsertDependencyPayload = { projectId: string; dependency: DependencyData }
type DeleteDependencyPayload = { projectId: string; dependencyId: string }

const dependenciesSlice = createSlice({
    name: 'dependencies',
    initialState,
    reducers: {
        setDependencies: (state, action: PayloadAction<SetDependenciesPayload>) => {
            const { projectId, dependencies } = action.payload
            state.byProjectId[projectId] = { ...dependencies }
        },
        upsertDependency: (state, action: PayloadAction<UpsertDependencyPayload>) => {
            const { projectId, dependency } = action.payload
            if (!state.byProjectId[projectId]) {
                state.byProjectId[projectId] = {}
            }
            state.byProjectId[projectId][dependency.id] = dependency
        },
        deleteDependency: (state, action: PayloadAction<DeleteDependencyPayload>) => {
            const { projectId, dependencyId } = action.payload
            const deps = state.byProjectId[projectId]
            if (!deps) return
            delete deps[dependencyId]
        },
        clearProjectDependencies: (state, action: PayloadAction<{ projectId: string }>) => {
            const { projectId } = action.payload
            delete state.byProjectId[projectId]
        }
    }
})

export const {
    setDependencies,
    upsertDependency,
    deleteDependency,
    clearProjectDependencies
} = dependenciesSlice.actions

export default dependenciesSlice.reducer
