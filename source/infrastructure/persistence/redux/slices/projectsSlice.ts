/**
 * Projects Redux Slice
 * Manages project state in the Redux store
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ProjectData {
    id: string
    name: string
    startDate: string
    endDate: string
    createdAt: string
    updatedAt: string
}

export interface ProjectsState {
    byId: Record<string, ProjectData>
    currentProjectId: string | null
}

const initialState: ProjectsState = {
    byId: {},
    currentProjectId: null
}

const projectsSlice = createSlice({
    name: 'projects',
    initialState,
    reducers: {
        setProjects: (state, action: PayloadAction<Record<string, ProjectData>>) => {
            state.byId = { ...action.payload }
        },
        upsertProject: (state, action: PayloadAction<ProjectData>) => {
            state.byId[action.payload.id] = action.payload
        },
        updateProject: (state, action: PayloadAction<{ projectId: string; updates: Partial<ProjectData> }>) => {
            const { projectId, updates } = action.payload
            if (!state.byId[projectId]) return
            state.byId[projectId] = {
                ...state.byId[projectId],
                ...updates,
                updatedAt: new Date().toISOString()
            }
        },
        deleteProject: (state, action: PayloadAction<{ projectId: string }>) => {
            const { projectId } = action.payload
            delete state.byId[projectId]
            if (state.currentProjectId === projectId) {
                state.currentProjectId = null
            }
        },
        setCurrentProject: (state, action: PayloadAction<string | null>) => {
            state.currentProjectId = action.payload
        }
    }
})

export const {
    setProjects,
    upsertProject,
    updateProject,
    deleteProject,
    setCurrentProject
} = projectsSlice.actions

export default projectsSlice.reducer
