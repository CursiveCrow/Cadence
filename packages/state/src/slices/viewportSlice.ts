import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ViewportState } from '../types'

const initialState: ViewportState = { x: 0, y: 0, zoom: 1 }

export const viewportSlice = createSlice({
    name: 'viewport',
    initialState,
    reducers: {
        setViewport: (_state, action: PayloadAction<ViewportState>) => action.payload,
        updateViewport: (state, action: PayloadAction<Partial<ViewportState>>) => ({ ...state, ...action.payload }),
    }
})

export const { setViewport, updateViewport } = viewportSlice.actions
export default viewportSlice.reducer


