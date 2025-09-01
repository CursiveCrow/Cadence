import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ViewportState } from '../types'
const initialState: ViewportState = { x: 0, y: 0, zoom: 1 }
const viewportSlice = createSlice({ name: 'viewport', initialState, reducers: { setViewport: (_s, a: PayloadAction<ViewportState>) => a.payload, updateViewport: (s, a: PayloadAction<Partial<ViewportState>>) => ({ ...s, ...a.payload }) } })
export const { setViewport, updateViewport } = viewportSlice.actions
export default viewportSlice.reducer

