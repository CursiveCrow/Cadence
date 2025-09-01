/**
 * Timeline Redux Slice
 * Manages timeline-specific configuration and state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface TimelineConfig {
    DAY_WIDTH: number
    TASK_HEIGHT: number
    TOP_MARGIN: number
    LEFT_MARGIN: number
    STAFF_SPACING: number
    STAFF_LINE_SPACING: number
    GRID_COLOR_MINOR: number
    GRID_COLOR_MAJOR: number
    TASK_COLOR: number
    TASK_COLOR_HOVER: number
    TASK_COLOR_SELECTED: number
    DEPENDENCY_COLOR: number
    SELECTION_COLOR: number
    TODAY_LINE_COLOR: number
    WEEKEND_FILL_COLOR: number
    SHOW_WEEKENDS: boolean
    SHOW_TODAY_LINE: boolean
    SHOW_GRID: boolean
    SHOW_LABELS: boolean
    SNAP_TO_GRID: boolean
    GRID_SNAP_SIZE: number
}

export interface TimelineState {
    config: TimelineConfig
    hoveredTaskId: string | null
    draggedTaskId: string | null
    isCreatingDependency: boolean
    dependencySourceId: string | null
    playheadPosition: number
    isPlaying: boolean
    playbackSpeed: number
}

const defaultConfig: TimelineConfig = {
    DAY_WIDTH: 30,
    TASK_HEIGHT: 20,
    TOP_MARGIN: 60,
    LEFT_MARGIN: 120,
    STAFF_SPACING: 120,
    STAFF_LINE_SPACING: 24,
    GRID_COLOR_MINOR: 0xe0e0e0,
    GRID_COLOR_MAJOR: 0xc0c0c0,
    TASK_COLOR: 0x4285f4,
    TASK_COLOR_HOVER: 0x5a95f5,
    TASK_COLOR_SELECTED: 0x1a73e8,
    DEPENDENCY_COLOR: 0x666666,
    SELECTION_COLOR: 0x4285f4,
    TODAY_LINE_COLOR: 0xff0000,
    WEEKEND_FILL_COLOR: 0xf5f5f5,
    SHOW_WEEKENDS: true,
    SHOW_TODAY_LINE: true,
    SHOW_GRID: true,
    SHOW_LABELS: true,
    SNAP_TO_GRID: true,
    GRID_SNAP_SIZE: 1, // Days
}

const initialState: TimelineState = {
    config: defaultConfig,
    hoveredTaskId: null,
    draggedTaskId: null,
    isCreatingDependency: false,
    dependencySourceId: null,
    playheadPosition: 0,
    isPlaying: false,
    playbackSpeed: 1
}

const timelineSlice = createSlice({
    name: 'timeline',
    initialState,
    reducers: {
        updateConfig: (state, action: PayloadAction<Partial<TimelineConfig>>) => {
            state.config = { ...state.config, ...action.payload }
        },
        resetConfig: (state) => {
            state.config = defaultConfig
        },
        setHoveredTask: (state, action: PayloadAction<string | null>) => {
            state.hoveredTaskId = action.payload
        },
        setDraggedTask: (state, action: PayloadAction<string | null>) => {
            state.draggedTaskId = action.payload
        },
        startCreatingDependency: (state, action: PayloadAction<string>) => {
            state.isCreatingDependency = true
            state.dependencySourceId = action.payload
        },
        cancelCreatingDependency: (state) => {
            state.isCreatingDependency = false
            state.dependencySourceId = null
        },
        completeCreatingDependency: (state) => {
            state.isCreatingDependency = false
            state.dependencySourceId = null
        },
        setPlayheadPosition: (state, action: PayloadAction<number>) => {
            state.playheadPosition = action.payload
        },
        togglePlayback: (state) => {
            state.isPlaying = !state.isPlaying
        },
        setPlaybackSpeed: (state, action: PayloadAction<number>) => {
            state.playbackSpeed = Math.max(0.25, Math.min(4, action.payload))
        },
        movePlayhead: (state, action: PayloadAction<number>) => {
            state.playheadPosition += action.payload
        }
    }
})

export const {
    updateConfig,
    resetConfig,
    setHoveredTask,
    setDraggedTask,
    startCreatingDependency,
    cancelCreatingDependency,
    completeCreatingDependency,
    setPlayheadPosition,
    togglePlayback,
    setPlaybackSpeed,
    movePlayhead
} = timelineSlice.actions

export default timelineSlice.reducer
