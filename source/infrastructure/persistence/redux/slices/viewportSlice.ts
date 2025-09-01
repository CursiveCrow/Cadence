/**
 * Viewport Redux Slice
 * Manages viewport state for panning and zooming
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ViewportState {
    x: number
    y: number
    zoom: number
    verticalScale: number
    isDragging: boolean
    dragStartX: number
    dragStartY: number
}

const initialState: ViewportState = {
    x: 0,
    y: 0,
    zoom: 1,
    verticalScale: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
}

const viewportSlice = createSlice({
    name: 'viewport',
    initialState,
    reducers: {
        setViewport: (state, action: PayloadAction<{ x?: number; y?: number; zoom?: number }>) => {
            const { x, y, zoom } = action.payload
            if (x !== undefined) state.x = x
            if (y !== undefined) state.y = y
            if (zoom !== undefined) state.zoom = Math.max(0.1, Math.min(5, zoom))
        },
        pan: (state, action: PayloadAction<{ dx: number; dy: number }>) => {
            const { dx, dy } = action.payload
            state.x += dx
            state.y += dy
        },
        zoom: (state, action: PayloadAction<{ delta: number; centerX?: number; centerY?: number }>) => {
            const { delta, centerX = 0, centerY = 0 } = action.payload
            const oldZoom = state.zoom
            const newZoom = Math.max(0.1, Math.min(5, oldZoom * (1 + delta)))

            // Adjust pan to keep the zoom centered
            const zoomRatio = newZoom / oldZoom
            state.x = centerX - (centerX - state.x) * zoomRatio
            state.y = centerY - (centerY - state.y) * zoomRatio
            state.zoom = newZoom
        },
        setVerticalScale: (state, action: PayloadAction<number>) => {
            state.verticalScale = Math.max(0.5, Math.min(2, action.payload))
        },
        resetViewport: (state) => {
            state.x = 0
            state.y = 0
            state.zoom = 1
            state.verticalScale = 1
        },
        startDragging: (state, action: PayloadAction<{ x: number; y: number }>) => {
            state.isDragging = true
            state.dragStartX = action.payload.x
            state.dragStartY = action.payload.y
        },
        stopDragging: (state) => {
            state.isDragging = false
            state.dragStartX = 0
            state.dragStartY = 0
        },
        fitToContent: (state, action: PayloadAction<{
            contentWidth: number
            contentHeight: number
            viewportWidth: number
            viewportHeight: number
        }>) => {
            const { contentWidth, contentHeight, viewportWidth, viewportHeight } = action.payload
            const zoomX = viewportWidth / contentWidth
            const zoomY = viewportHeight / contentHeight
            const newZoom = Math.min(zoomX, zoomY, 1) * 0.9 // 90% to add some padding

            state.zoom = newZoom
            state.x = (viewportWidth - contentWidth * newZoom) / 2
            state.y = (viewportHeight - contentHeight * newZoom) / 2
        }
    }
})

export const {
    setViewport,
    pan,
    zoom,
    setVerticalScale,
    resetViewport,
    startDragging,
    stopDragging,
    fitToContent
} = viewportSlice.actions

export default viewportSlice.reducer
