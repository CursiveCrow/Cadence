/**
 * Redux Store Configuration
 * Central state management for the application
 */

import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import tasksReducer from './slices/tasksSlice'
import dependenciesReducer from './slices/dependenciesSlice'
import staffsReducer from './slices/staffsSlice'
import projectsReducer from './slices/projectsSlice'
import uiReducer from './slices/uiSlice'
import selectionReducer from './slices/selectionSlice'
import viewportReducer from './slices/viewportSlice'
import timelineReducer from './slices/timelineSlice'

// Stable empty references to avoid creating new objects/arrays in selectors
const EMPTY_OBJECT: Readonly<Record<string, never>> = Object.freeze({})

export const store = configureStore({
    reducer: {
        // Domain state
        tasks: tasksReducer,
        dependencies: dependenciesReducer,
        staffs: staffsReducer,
        projects: projectsReducer,

        // UI state
        ui: uiReducer,
        selection: selectionReducer,
        viewport: viewportReducer,
        timeline: timelineReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types
                ignoredActions: ['viewport/setViewport'],
                // Ignore these field paths in all actions
                ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
                // Ignore these paths in the state
                ignoredPaths: ['ui.contextMenu'],
            },
        }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks for use throughout the app
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Selectors
export const selectTasksByProject = (projectId: string) => (state: RootState) => {
    return state.tasks.byProjectId[projectId] || EMPTY_OBJECT
}

export const selectDependenciesByProject = (projectId: string) => (state: RootState) => {
    return state.dependencies.byProjectId[projectId] || EMPTY_OBJECT
}

export const selectStaffsByProject = (projectId: string) => (state: RootState) => {
    return state.staffs.byProjectId[projectId] || EMPTY_OBJECT
}

export const selectProjectById = (projectId: string) => (state: RootState) => {
    return state.projects.byId[projectId]
}

export const selectSelectedTaskIds = (state: RootState) => state.selection.selectedTaskIds
export const selectViewport = (state: RootState) => state.viewport
export const selectTimelineConfig = (state: RootState) => state.timeline.config

// Export store for repository access
export default store
