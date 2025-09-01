/**
 * UI Redux Slice
 * Manages general UI state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface UIState {
    sidebarOpen: boolean
    sidebarWidth: number
    taskDetailsOpen: boolean
    selectedTaskId: string | null
    contextMenu: {
        open: boolean
        x: number
        y: number
        type: 'task' | 'dependency' | 'staff' | null
        targetId: string | null
    } | null
    isLoading: boolean
    error: string | null
    theme: 'light' | 'dark'
}

const initialState: UIState = {
    sidebarOpen: true,
    sidebarWidth: 320,
    taskDetailsOpen: false,
    selectedTaskId: null,
    contextMenu: null,
    isLoading: false,
    error: null,
    theme: 'light'
}

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.sidebarOpen = action.payload
        },
        setSidebarWidth: (state, action: PayloadAction<number>) => {
            state.sidebarWidth = action.payload
        },
        openTaskDetails: (state, action: PayloadAction<string>) => {
            state.taskDetailsOpen = true
            state.selectedTaskId = action.payload
        },
        closeTaskDetails: (state) => {
            state.taskDetailsOpen = false
            state.selectedTaskId = null
        },
        showContextMenu: (state, action: PayloadAction<{
            x: number
            y: number
            type: 'task' | 'dependency' | 'staff'
            targetId: string
        }>) => {
            state.contextMenu = {
                open: true,
                ...action.payload
            }
        },
        hideContextMenu: (state) => {
            state.contextMenu = null
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },
        setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
            state.theme = action.payload
        },
        toggleTheme: (state) => {
            state.theme = state.theme === 'light' ? 'dark' : 'light'
        }
    }
})

export const {
    toggleSidebar,
    setSidebarOpen,
    setSidebarWidth,
    openTaskDetails,
    closeTaskDetails,
    showContextMenu,
    hideContextMenu,
    setLoading,
    setError,
    setTheme,
    toggleTheme
} = uiSlice.actions

export default uiSlice.reducer
