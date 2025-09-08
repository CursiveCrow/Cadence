import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Project } from '@cadence/core'

export const projectsAdapter = createEntityAdapter<Project>()

// Annotate as any to avoid non-portable type names from Immer in declaration emit
const projectsSlice: any = createSlice({
    name: 'projects',
    initialState: projectsAdapter.getInitialState(),
    reducers: {
        upsertMany: (state, action: PayloadAction<Project[]>) => {
            projectsAdapter.upsertMany(state, action.payload)
        },
        upsertOne: (state, action: PayloadAction<Project>) => {
            projectsAdapter.upsertOne(state, action.payload)
        },
        removeMany: (state, action: PayloadAction<string[]>) => {
            projectsAdapter.removeMany(state, action.payload)
        },
        removeOne: (state, action: PayloadAction<string>) => {
            projectsAdapter.removeOne(state, action.payload)
        },
        setAll: (state, action: PayloadAction<Project[]>) => {
            projectsAdapter.setAll(state, action.payload)
        },
        clear: (state) => {
            projectsAdapter.removeAll(state)
        },
    },
})

export const { upsertMany: upsertProjectsMany, upsertOne: upsertProject, removeMany: removeProjectsMany, removeOne: removeProject, setAll: setAllProjects, clear: clearProjects } = projectsSlice.actions
export default projectsSlice.reducer
export const projectsSelectors = projectsAdapter.getSelectors<{
    projects: ReturnType<typeof projectsSlice.reducer>
}>((state) => (state as any).projects)


